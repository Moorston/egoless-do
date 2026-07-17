import json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
for bi in [11,12,13,14,15]:
    res = json.loads((P/f".ua/tmp/ua-file-extract-results-{bi}.json").read_text(encoding="utf-8"))
    rs = sorted(res["results"], key=lambda r: r["totalLines"], reverse=True)[:5]
    print(f"=== batch {bi} top5 ===")
    for r in rs: print("  ", r["totalLines"], r["path"])
