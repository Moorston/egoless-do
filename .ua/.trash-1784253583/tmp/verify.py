import json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
UA = P / ".ua"

for bi in [11]:
    g = json.loads((UA/f"intermediate/batch-{bi}.json").read_text("utf-8"))
    inp = json.loads((UA/f"tmp/ua-file-analyzer-input-{bi}.json").read_text("utf-8"))
    imp = inp["batchImportData"]
    # expected imports edges = sum of len of each (only counting in-batch targets)
    res = json.loads((UA/f"tmp/ua-file-extract-results-{bi}.json").read_text("utf-8"))
    inb = {r["path"] for r in res["results"]}
    exp_imp = sum(len([t for t in ts if t in inb]) for ts in imp.values())
    edges_by = {}
    for e in g["edges"]:
        edges_by[e["type"]] = edges_by.get(e["type"],0)+1
    print(f"batch {bi}: nodes={len(g['nodes'])} edges={len(g['edges'])}")
    print("  edge types:", edges_by)
    print("  expected imports (in-batch):", exp_imp, " actual:", edges_by.get("imports",0))
    # check all node ids unique
    ids = [n["id"] for n in g["nodes"]]
    print("  unique ids:", len(set(ids)), "==", len(ids))
    # check all edge endpoints exist
    idset = set(ids)
    missing = [(e["source"],e["target"]) for e in g["edges"] if e["source"] not in idset or e["target"] not in idset]
    print("  missing endpoints:", missing[:5])
