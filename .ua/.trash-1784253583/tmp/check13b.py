import re
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
raw = (P/".ua/tmp/sem-batch13.json").read_text("utf-8")
lines = raw.splitlines()
depth = 0
in_string = False
escape = False
for i, line in enumerate(lines, 1):
    for ch in line:
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
    if i in range(180, 205):
        print(f"depth={depth:2d} L{i:3d}: {line.rstrip()[:90]}")
print("FINAL depth:", depth)
