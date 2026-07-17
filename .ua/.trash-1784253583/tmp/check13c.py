import re
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
raw = (P/".ua/tmp/sem-batch13.json").read_text("utf-8")
lines = raw.splitlines()
# Find lines with { or } that are inside strings (odd number of quotes before)
for i, line in enumerate(lines, 1):
    for m in re.finditer(r'[{}]', line):
        pos = m.start()
        prefix = line[:pos]
        # count unescaped quotes
        nq = len(re.findall(r'(?<!\\)"', prefix))
        if nq % 2 == 1:  # inside a string
            print(f"L{i}: brace inside string: ...{line[max(0,pos-20):pos+20]}...")
