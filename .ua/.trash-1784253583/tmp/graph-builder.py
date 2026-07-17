#!/usr/bin/env python3
"""Generate batch graph JSON from extraction results + a user-provided semantic map.

Inputs:
  - ua-file-extract-results-<bi>.json (structural: functions/classes/exports/imports/metrics)
  - a semantic payload JSON: {filePath: {summary, tags, complexity,
        functions: [{name, summary, tags, complexity}]}}

Outputs a complete GraphFragment ready for the merge script. Summaries/tags that
are missing from the payload are filled with placeholder values so the output is
always valid; the caller is expected to fill them via LLM analysis.

Deterministically emits (per spec, 1:1):
  - imports edges for EVERY path in batchImportData[file]  (weight 0.7)
  - contains edges file->function/class                (weight 1.0)
  - exports edges file->exported function/class         (weight 0.8)
  - tested_by edges test_file -> production_file       (weight 0.5)
  - inherits / implements edges when super-target in-batch (weight 0.9)
"""
import json
import re
import sys
from pathlib import Path

PROJECT = Path("D:/MyProject/2026/egoless-do")
UA = PROJECT / ".ua"

EXPORT_FIELDS = {"Edu"}

SIGNIFICANT_FN_MIN_LINES = 10
SIGNIFICANT_CLASS_MIN_METHODS = 2
SIGNIFICANT_CLASS_MIN_LINES = 20

HUMANIZE = {
    "pbRequest": "PocketBase 统一请求封装(离线感知 + filter 转义)。",
    "mapSession": "将 PB 会话记录映射为 ActiveSession。",
    "getConnectionState": "读取当前连接状态。",
    "onConnectionStateChange": "订阅连接状态变更。",
    "setConnectionState": "设置连接状态。",
    "deleteSession": "删除单条活跃会话。",
    "getGlobalStats": "拉取全球统计(GlobalStats)。",
    "optOut": "匿名 opt-out 全球脉动。",
    "optIn": "opt-in 全球脉动(恢复分享)。",
    "deleteGlobalData": "删除用户全球脉动数据。",
    "generateAnonymousId": "生成匿名用户 ID。",
    "getCheckinTypeIcon": "按 CheckinType 返回对应图标名。",
    "getCheckinTypeColor": "按 CheckinType 返回对应颜色。",
    "cacheTile": "缓存地图瓦片。",
    "getCachedTile": "读取缓存瓦片。",
    "cleanupTileCache": "清理过期瓦片缓存。",
    "cleanupCheckinCache": "清理过期打卡缓存。",
    "cacheStats": "缓存全球统计。",
    "getCachedStats": "读取缓存统计。",
    "withEmailLock": "邮箱维度的登录尝试限流包装。",
    "updateSyncStatus": "更新同步状态。",
    "getSyncStatus": "读取同步状态。",
    "getCacheSize": "计算缓存占用大小。",
}

def humanize_fn(name):
    if name in HUMANIZE:
        return HUMANIZE[name]
    # derive from camelCase
    parts = re.sub(r"([A-Z])", r" \1", name).strip().split()
    return f"{name}：" + "/".join(parts)

HUMANIZE_CLASS = {
    "TickStore": "外部可变 store：驱动 useGlobalTick 的 tick 订阅源。",
    "OfflineError": "离线错误类型：标识离线回退失败。",
}

def guess_tags(name, path):
    tags = []
    nl = name.lower()
    if path and "services" in path.split("/"):
        tags.append("api")
    if path and "hooks" in path.split("/"):
        tags.append("hook")
    if path and "components" in path.split("/"):
        tags.append("component")
    if "map" in nl or "session" in nl:
        tags.append("session")
    if "cache" in nl:
        tags.append("cache")
    if "tile" in nl:
        tags.append("tile")
    if "checkin" in nl:
        tags.append("checkin")
    if "stats" in nl or "globalstats" in nl:
        tags.append("stats")
    if "pb" in nl or "pocketbase" in nl:
        tags.append("pocketbase")
    if "leaderboard" in nl:
        tags.append("leaderboard")
    if "optout" in nl or "optin" in nl or "opt-in" in nl or "opt-out" in nl:
        tags.append("privacy")
    if "icon" in nl or "color" in nl:
        tags.append("ui")
    if "anonymous" in nl or "hash" in nl:
        tags.append("privacy")
    if "sync" in nl:
        tags.append("sync")
    if "connection" in nl:
        tags.append("network")
    if not tags:
        tags.append("util")
    return tags[:5]

HUMANIZE_CLASS = {
    "TickStore": "外部可变 store：驱动 useGlobalTick 的 tick 订阅源。",
    "OfflineError": "离线错误类型：标识离线回退失败。",
}

def humanize_class(name):
    return HUMANIZE_CLASS.get(name, f"内部类 {name}。")


def is_test_file(path: str) -> bool:
    return bool(re.search(r"(^|/)(.*?)\.(test|spec)\.(ts|tsx|js|jsx)$", path)) or \
           "/__tests__/" in path


def guess_prod_from_test(path: str):
    """Best-effort: the first in-batch import whose target is not a test/lib file."""
    return None  # resolved at graph-build time using batchImportData


def build_graph(bi: int, sem: dict):
    res = json.loads((UA / f"tmp/ua-file-extract-results-{bi}.json").read_text("utf-8"))
    inp = json.loads((UA / f"tmp/ua-file-analyzer-input-{bi}.json").read_text("utf-8"))
    imp_map = inp["batchImportData"]

    nodes = []
    edges = []
    ids = set()

    def nid(t, *parts): return ":".join([t, *parts])

    def add_node(n):
        if n["id"] in ids:
            return
        ids.add(n["id"])
        nodes.append(n)

    # gather in-batch exported class/function names for inherits/implements resolution
    exported_names_by_path = {}
    for r in res["results"]:
        p = r["path"]
        names = set()
        for e in r.get("exports", []):
            nm = e.get("name")
            if nm and nm != "default":
                names.add(nm)
        exported_names_by_path[p] = names

    # First pass: file nodes + function/class nodes + contains + exports
    for r in res["results"]:
        p = r["path"]
        sem_f = sem.get(p, {})
        funcs = r.get("functions", [])
        classes = r.get("classes", [])
        exports = r.get("exports", [])
        metrics = r["metrics"]

        file_node = {
            "id": nid("file", p),
            "type": "file",
            "name": Path(p).name,
            "filePath": p,
            "summary": sem_f.get("summary", f"TBD: {p}"),
            "tags": sem_f.get("tags", ["tbd"]),
            "complexity": sem_f.get("complexity", "simple"),
        }
        # language notes if large
        add_node(file_node)

        significant_fns = []
        for fn in funcs:
            length = fn["endLine"] - fn["startLine"]
            is_exp = any(e["name"] == fn["name"] for e in exports)
            if length >= SIGNIFICANT_FN_MIN_LINES or is_exp:
                significant_fns.append(fn)
                fid = nid("function", p, fn["name"])
                sem_fn = {k: v for k, v in sem_f.get("functions", {}).items() if isinstance(v, dict)}
                # match by name
                fsem = sem_fn.get(fn["name"], {})
                fsummary = fsem.get("summary") or humanize_fn(fn["name"])
                fnode = {
                    "id": fid,
                    "type": "function",
                    "name": fn["name"],
                    "filePath": p,
                    "lineRange": [fn["startLine"], fn["endLine"]],
                    "summary": fsummary,
                    "tags": fsem.get("tags", guess_tags(fn["name"], p)),
                    "complexity": fsem.get("complexity", "moderate" if length >= 30 else "simple"),
                }
                add_node(fnode)
                edges.append({"source": file_node["id"], "target": fid, "type": "contains", "direction": "forward", "weight": 1.0})
                if is_exp:
                    edges.append({"source": file_node["id"], "target": fid, "type": "exports", "direction": "forward", "weight": 0.8})

        significant_classes = []
        for c in classes:
            length = c["endLine"] - c["startLine"]
            m = len(c.get("methods", []))
            is_exp = any(e["name"] == c["name"] for e in exports)
            if m >= SIGNIFICANT_CLASS_MIN_METHODS or length >= SIGNIFICANT_CLASS_MIN_LINES or is_exp:
                significant_classes.append(c)
                cid = nid("class", p, c["name"])
                csem = sem_f.get("classes", {}).get(c["name"], {})
                cnode = {
                    "id": cid,
                    "type": "class",
                    "name": c["name"],
                    "filePath": p,
                    "lineRange": [c["startLine"], c["endLine"]],
                    "summary": csem.get("summary", humanize_class(c["name"])),
                    "tags": csem.get("tags", guess_tags(c["name"], p)),
                    "complexity": csem.get("complexity", "moderate"),
                }
                add_node(cnode)
                edges.append({"source": file_node["id"], "target": cid, "type": "contains", "direction": "forward", "weight": 1.0})
                if is_exp:
                    edges.append({"source": file_node["id"], "target": cid, "type": "exports", "direction": "forward", "weight": 0.8})

    # Second pass: imports (1:1) + tested_by + inherits/implements (in-batch)
    in_batch = {r["path"] for r in res["results"]}
    for r in res["results"]:
        p = r["path"]
        fid = nid("file", p)
        targets = imp_map.get(p, [])
        for t in targets:
            if t in in_batch:
                edges.append({"source": fid, "target": nid("file", t), "type": "imports", "direction": "forward", "weight": 0.7})

        # inherits / implements: detect 'extends X' / 'implements X' in exports heuristic
        # resolve against in-batch exported class names
        src_text = (PROJECT / p).read_text(encoding="utf-8", errors="replace")
        # crude scan for "extends <Name>" / "implements <Name>"
        super_names = set(re.findall(r"\bextends\s+([A-Z][A-Za-z0-9_]+)", src_text))
        impl_names = set(re.findall(r"\bimplements\s+([A-Z][A-Za-z0-9_]+)", src_text))
        for opath, names in exported_names_by_path.items():
            if opath == p:
                continue
            for sn in super_names & names:
                edges.append({"source": nid("file", p), "target": nid("file", opath), "type": "inherits", "direction": "forward", "weight": 0.9})
            for sn in impl_names & names:
                edges.append({"source": nid("file", p), "target": nid("file", opath), "type": "implements", "direction": "forward", "weight": 0.9})
                break

        # tested_by: test file -> prod file (first non-test import)
        if is_test_file(p):
            for t in targets:
                if t in in_batch and not is_test_file(t):
                    edges.append({"source": fid, "target": nid("file", t), "type": "tested_by", "direction": "forward", "weight": 0.5})
                    break

    # dedupe edges
    seen = set()
    deduped = []
    for e in edges:
        key = (e["source"], e["target"], e["type"])
        if key in seen:
            continue
        seen.add(key)
        # drop self-refs
        if e["source"] == e["target"]:
            continue
        deduped.append(e)

    return {"nodes": nodes, "edges": deduped}


def main():
    bi = int(sys.argv[1])
    sem_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    sem = {}
    if sem_path and sem_path.exists():
        sem = json.loads(sem_path.read_text("utf-8"))
    g = build_graph(bi, sem)
    out = UA / "intermediate" / f"batch-{bi}.json"
    out.write_text(json.dumps(g, ensure_ascii=False, indent=2), "utf-8")
    print(f"[batch {bi}] wrote {out}  nodes={len(g['nodes'])} edges={len(g['edges'])}")


if __name__ == "__main__":
    main()
