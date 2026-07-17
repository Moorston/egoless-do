import json
from pathlib import Path

P = Path("D:/MyProject/2026/egoless-do")
res = json.loads((P/".ua/tmp/ua-file-extract-results-11.json").read_text(encoding="utf-8"))
imp = json.loads((P/".ua/tmp/ua-file-analyzer-input-11.json").read_text(encoding="utf-8"))["batchImportData"]

for r in res["results"]:
    f = r["path"]
    funcs = r.get("functions", [])
    classes = r.get("classes", [])
    exports = r.get("exports", [])
    imp_count = r["metrics"]["importCount"]
    big_funcs = [(fn['name'], fn['startLine'], fn['endLine']) for fn in funcs if (fn['endLine']-fn['startLine']) >= 10]
    sig_classes = [(c['name'], c['startLine'], c['endLine'], len(c.get('methods',[]))) for c in classes if len(c.get('methods',[]))>=2 or (c['endLine']-c['startLine'])>=20]
    if big_funcs or sig_classes or exports or imp.get(f):
        print(f"\n[{f}] imp={imp_count} exp={len(exports)}")
        if imp.get(f): print("   IMPORTS:", imp[f][:8])
        if big_funcs: print("   BIGFUNCS:", big_funcs[:12])
        if sig_classes: print("   CLASSES:", sig_classes[:10])
        if exports: print("   EXPORTS:", [e["name"] for e in exports][:15])
