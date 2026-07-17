import json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
res = json.loads((P/".ua/tmp/ua-file-extract-results-12.json").read_text(encoding="utf-8"))
for r in res["results"]:
    path = P / r["path"]
    print("="*60)
    print("FILE:", r["path"], "| lines:", r["totalLines"])
    print("="*60)
    try:
        print(path.read_text(encoding="utf-8"))
    except Exception as e:
        print("ERR", e)
