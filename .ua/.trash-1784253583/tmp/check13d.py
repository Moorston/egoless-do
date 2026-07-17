import re, json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
raw = (P/".ua/tmp/sem-batch13.json").read_text("utf-8")
lines = raw.splitlines()
# walk char by char tracking real depth through strings
depth = 0
in_str = False
esc = False
first_problem = None
for i, line in enumerate(lines, 1):
    for j, ch in enumerate(line):
        if in_str:
            if esc: esc = False
            elif ch == '\\': esc = True
            elif ch == '"': in_str = False
        else:
            if ch == '"': in_str = True
            elif ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth < 0 and first_problem is None:
                    first_problem = (i, j, line)
print("FINAL depth:", depth)
print("first neg:", first_problem)
# find any line whose braces (outside strings) net +2 (extra open)
depth = 0
in_str = False
esc = False
for i, line in enumerate(lines, 1):
    start = depth
    for ch in line:
        if in_str:
            if esc: esc = False
            elif ch == '\\': esc = True
            elif ch == '"': in_str = False
        else:
            if ch == '"': in_str = True
            elif ch == '{': depth += 1
            elif ch == '}': depth -= 1
    net = depth - start
    if net != 0 and i <= 94:
        print(f"L{i}: net %+d  %s" % (net, line.strip()[:70]))
