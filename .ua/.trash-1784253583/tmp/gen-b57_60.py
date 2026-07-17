import json, os, re

OUT_DIR = "D:/MyProject/2026/egoless-do/.ua/intermediate"
PROJ = "D:/MyProject/2026/egoless-do"

# Curated metadata for non-trellis files and notable code files.
CURATED = {
  # Batch 57
  ".github/dependabot.yml": {
    "summary":"GitHub Dependabot 自动更新配置，定义 npm/pnpm 依赖与 GitHub Actions 的周期版本升级策略。",
    "tags":["config","dependabot","dependencies","automation"],"complexity":"simple","nodeType":"config"
  },
  ".gitmodules": {
    "summary":"Git 子模块定义文件（当前未配置任何子模块，为空清单）。",
    "tags":["config","git","submodules"],"complexity":"simple","nodeType":"config"
  },
  ".npmrc": {
    "summary":"pnpm/npm 注册表配置文件，设定包管理行为（如严格对等依赖、hoist 策略等）。",
    "tags":["config","npm","pnpm"],"complexity":"simple","nodeType":"config"
  },
  ".trellis/.version": {
    "summary":"Trellis 工具的版本锁文件，记录当前使用的 Trellis 版本号。",
    "tags":["config","trellis","version"],"complexity":"simple","nodeType":"config"
  },
  ".trellis/agents/check.md": {
    "summary":"Trellis Check Agent 指令：由 channel runtime 派生，对未提交 diff 按任务产物和规范审查、自修复并报告。",
    "tags":["documentation","trellis","agent","code-review"],"complexity":"moderate","nodeType":"document"
  },
  ".trellis/agents/implement.md": {
    "summary":"Trellis Implement Agent 指令：按计划产物执行具体编码任务，遵照设计/实现文档落地功能。",
    "tags":["documentation","trellis","agent","implementation"],"complexity":"moderate","nodeType":"document"
  },
  ".trellis/plans/auth-proxy-extraction.md": {
    "summary":"认证代理提取（auth-proxy-extraction）计划文档，规划将鉴权逻辑抽取为独立代理/模块的方案与阶段。",
    "tags":["documentation","trellis","plan","auth"],"complexity":"moderate","nodeType":"document"
  },
  ".trellis/scripts/__init__.py": {
    "summary":"Trellis scripts 包的 Python 初始化文件（空），将 scripts 目录标记为包。",
    "tags":["trellis","python","init"],"complexity":"simple","nodeType":"file"
  },
  ".trellis/scripts/common/cli_adapter.py": {
    "summary":"多平台 CLI 适配器：抽象 Claude Code/OpenCode/Cursor/iFlow/Codex 等 16+ AI 编码 CLI 工具差异，提供统一 agent 名/命令/目录映射。",
    "tags":["trellis","python","cli","multi-platform"],"complexity":"complex","nodeType":"file",
    "classes":[{"name":"CLIAdapter","startLine":63,"endLine":629,
                "summary":"dataclass 适配器，按 platform 提供 agent name、config 目录、命令构建、session 等差异化方法（20+ 成员）。",
                "tags":["cli","adapter","multi-platform"],"complexity":"complex"}],
    "functions":[
      {"name":"get_cli_adapter","startLine":637,"endLine":679,"summary":"工厂函数：按平台名返回 CLIAdapter，兼容 windsurf 已弃用别名并校验支持列表。","tags":["cli","factory"]},
      {"name":"_has_other_platform_dir","startLine":709,"endLine":715,"summary":"检测项目根是否已存在其他平台的配置目录，辅助平台推断。","tags":["cli","detect"]},
      {"name":"detect_platform","startLine":718,"endLine":873,"summary":"自动检测项目所用 CLI 平台，遍历配置目录依据特征判定并返回 Platform。","tags":["cli","detect","platform"]},
      {"name":"get_cli_adapter_auto","startLine":876,"endLine":886,"summary":"自动检测项目平台并返回对应 CLIAdapter 的便捷入口。","tags":["cli","factory","auto"]},
    ]
  },
  ".trellis/scripts/hooks/linear_sync.py": {
    "summary":"Linear 同步钩子：在 Trellis 任务 create/start/archive 生命周期事件时，通过 linearis CLI 同步状态到 Linear。",
    "tags":["trellis","python","linear","hook"],"complexity":"complex","nodeType":"file",
    "functions":[
      {"name":"_load_config","startLine":48,"endLine":62,"summary":"从 .trellis/hooks.local.json 加载本地钩子配置（team/project/assignees）。","tags":["linear","config"]},
      {"name":"_read_task","startLine":75,"endLine":81,"summary":"读取 TASK_JSON_PATH 指向的 task.json 内容。","tags":["linear","task"]},
      {"name":"_write_task","startLine":84,"endLine":87,"summary":"将任务数据写回 task.json 文件。","tags":["linear","task"]},
      {"name":"_linearis","startLine":90,"endLine":104,"summary":"封装 linearis CLI 子进程调用，错误时退出。","tags":["linear","cli"]},
      {"name":"_get_linear_issue","startLine":107,"endLine":111,"summary":"查询 Linear 中关联当前 task 的 issue。","tags":["linear","query"]},
      {"name":"cmd_create","startLine":117,"endLine":158,"summary":"create 命令：在 Linear 创建对应 issue 并回写到 task。","tags":["linear","create"]},
      {"name":"cmd_start","startLine":161,"endLine":168,"summary":"start 命令：将 Linear issue 状态推进到 In Progress。","tags":["linear","workflow"]},
      {"name":"cmd_archive","startLine":171,"endLine":177,"summary":"archive 命令：将 Linear issue 标记完成/归档。","tags":["linear","archive"]},
      {"name":"cmd_sync","startLine":180,"endLine":197,"summary":"sync 命令：根据 task 状态与解决状态映射同步 Linear issue。","tags":["linear","sync"]},
      {"name":"_resolve_parent_linear_issue","startLine":203,"endLine":224,"summary":"解析任务关联的父 Linear issue（归属 team/project）。","tags":["linear","resolve"]},
    ]
  },
}

def derive_trellis_task(data, prefix):
    """Return dict mapping relative path -> metadata for the 4 trellis task files.
    Reads task.json to obtain the human title."""
    base_rel = f".trellis/tasks/archive/2026-07/{prefix}"
    task_json_rel = f"{base_rel}/task.json"
    # Try to read title from task.json
    title = prefix
    tpath = os.path.join(PROJ, task_json_rel)
    if os.path.exists(tpath):
        try:
            with open(tpath, "r", encoding="utf-8") as f:
                t = json.load(f)
            title = t.get("title") or t.get("name") or prefix
        except Exception:
            pass
    return {
        f"{base_rel}/prd.md": {
            "summary": f"Trellis 归档任务「{title}」的需求文档（prd.md）。",
            "tags": ["documentation","trellis","prd","archive"],"complexity":"moderate","nodeType":"document"
        },
        f"{base_rel}/task.json": {
            "summary": f"Trellis 归档任务「{title}」的元数据（task.json）：id、标题、状态、优先级。",
            "tags": ["config","trellis","task","archive"],"complexity":"simple","nodeType":"config"
        },
        f"{base_rel}/check.jsonl": {
            "summary": f"Trellis 归档任务「{title}」的审查清单（check.jsonl）：列出审查文件与原因。",
            "tags": ["trellis","check","archive","qa"],"complexity":"simple","nodeType":"file"
        },
        f"{base_rel}/implement.jsonl": {
            "summary": f"Trellis 归档任务「{title}」的实施记录（implement.jsonl）：记录实际修改的文件与原因。",
            "tags": ["trellis","implement","archive"],"complexity":"simple","nodeType":"file"
        },
    }

def build_batch(data, extra_meta):
    files = data["files"]
    imp = data["batchImportData"]
    nodes = []
    edges = []
    seen = set()
    # Pre-derive trellis task metadata and merge with curated
    merged = dict(extra_meta)
    # find trellis task prefixes present in files
    task_file_re = re.compile(r'\.trellis/tasks/archive/2026-07/([^/]+)/(prd\.md|task\.json|check\.jsonl|implement\.jsonl)$')
    prefixes_seen = set()
    for fl in files:
        m = task_file_re.search(fl["path"])
        if m:
            prefixes_seen.add(m.group(1))
    for prefix in prefixes_seen:
        merged.update(derive_trellis_task(data, prefix))

    for fl in files:
        p = fl["path"]
        cat = fl.get("fileCategory","code")
        meta = merged.get(p, {})
        ftype = meta.get("nodeType", None)
        if ftype is None:
            if cat == "config": ftype = "config"
            elif cat == "docs": ftype = "document"
            else: ftype = "file"
        name = p.split("/")[-1]
        node = {"id": f"file:{p}", "type": ftype, "name": name, "filePath": p,
                "summary": meta.get("summary", f"文件 {p}。"),
                "tags": meta.get("tags", [cat]),
                "complexity": meta.get("complexity", "simple")}
        nodes.append(node)
        seen.add(node["id"])
        for fn in meta.get("functions", []):
            fnode = {"id": f"function:{p}:{fn['name']}", "type":"function",
                     "name": fn["name"], "filePath": p,
                     "lineRange":[fn["startLine"],fn["endLine"]],
                     "summary":fn["summary"],"tags":fn["tags"],
                     "complexity":fn.get("complexity","simple")}
            if fnode["id"] not in seen:
                nodes.append(fnode); seen.add(fnode["id"])
            edges.append({"source":f"file:{p}","target":f"function:{p}:{fn['name']}",
                          "type":"contains","direction":"forward","weight":1.0})
            if fn.get("exported", True):
                edges.append({"source":f"file:{p}","target":f"function:{p}:{fn['name']}",
                              "type":"exports","direction":"forward","weight":0.8})
        for cl in meta.get("classes", []):
            cnode = {"id": f"class:{p}:{cl['name']}", "type":"class",
                     "name": cl["name"], "filePath": p,
                     "lineRange":[cl["startLine"],cl["endLine"]],
                     "summary":cl["summary"],"tags":cl["tags"],
                     "complexity":cl.get("complexity","moderate")}
            if cnode["id"] not in seen:
                nodes.append(cnode); seen.add(cnode["id"])
            edges.append({"source":f"file:{p}","target":f"class:{p}:{cl['name']}",
                          "type":"contains","direction":"forward","weight":1.0})
            edges.append({"source":f"file:{p}","target":f"class:{p}:{cl['name']}",
                          "type":"exports","direction":"forward","weight":0.8})
    for src, tgts in imp.items():
        for t in tgts:
            edges.append({"source":f"file:{src}","target":f"file:{t}",
                          "type":"imports","direction":"forward","weight":0.7})
    return {"nodes":nodes,"edges":edges}

def validate(b):
    for n in b["nodes"]:
        nid = n.get("id")
        for k in ["id","type","name","summary","tags","complexity"]:
            if k not in n:
                raise AssertionError("bad node missing " + k + ": " + str(nid))
        if n["type"] in ("function","class"):
            if "lineRange" not in n:
                raise AssertionError("no lineRange in " + str(nid))
    for e in b["edges"]:
        for k in ["source","target","type","direction","weight"]:
            if k not in e:
                raise AssertionError("bad edge missing " + k + ": " + str(e))

for idx in [57,58,59,60]:
    with open(f"D:/MyProject/2026/egoless-do/.ua/tmp/batch-{idx}.json","r",encoding="utf-8") as f:
        data = json.load(f)
    extra = CURATED if idx == 57 else {}
    # Split logic
    nodes_edges = build_batch(data, extra)
    nn = len(nodes_edges["nodes"]); ne = len(nodes_edges["edges"])
    validate(nodes_edges)
    # All of 57-60 should be within single-batch limits
    assert nn <= 60 and ne <= 120, f"batch {idx} too big: {nn} nodes {ne} edges"
    with open(os.path.join(OUT_DIR, f"batch-{idx}.json"),"w",encoding="utf-8") as f:
        json.dump(nodes_edges, f, ensure_ascii=False, indent=2)
    print(f"wrote batch-{idx}.json nodes={nn} edges={ne}")
