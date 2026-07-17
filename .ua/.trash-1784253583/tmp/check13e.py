import re
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
raw = (P/".ua/tmp/sem-batch13.json").read_text("utf-8")
lines = raw.splitlines()
# scan only 'summary' lines for stray braces inside the quoted value
pat = re.compile(r'^\s*"summary":\s*("(?:[^"\\]|\\.)*"),')
for i, line in enumerate(lines, 1):
    m = pat.match(line)
    if m:
        val = m.group(1)
        if '{' in val or '}' in val:
            print(f"L{i}: brace in summary value: {val}")
