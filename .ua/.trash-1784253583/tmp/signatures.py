import json, re
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
bi = int(__import__("sys").argv[1])
res = json.loads((P/f".ua/tmp/ua-file-extract-results-{bi}.json").read_text(encoding="utf-8"))
for r in res["results"]:
    p = r["path"]
    txt = (P/p).read_text(encoding="utf-8", errors="replace")
    print("="*60)
    print(f"FILE: {p}  ({r['totalLines']}l)")
    # show imports (up to 30)
    imps = [l for l in txt.splitlines() if l.strip().startswith("import ") or l.strip().startswith("from ")]
    if imps:
        print("  IMPORTS:", imps[:20])
    # exported component name
    comp = re.findall(r"export default function (\w+)", txt)
    funcs = re.findall(r"export (?:function|const) (\w+)", txt)
    fnsig = re.findall(r"(?:function|const)\s+(\w+)\s*(?:<[^>]*>)?\((.*?)\)\s*(?::\s*[^{]+)?{", txt)
    bigf = r.get("functions", [])
    print("  fns:", [f"{n}({fn['startLine']}-{fn['endLine']})" for n,fn in [(f['name'],f) for f in bigf]][:15])
