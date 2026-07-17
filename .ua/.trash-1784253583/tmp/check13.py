import re, json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
raw = (P/".ua/tmp/sem-batch13.json").read_text("utf-8")
stripped = re.sub(r'"(?:[^"\\]|\\.)*"', '""', raw)
bal = 0
for ch in stripped:
    if ch == '{': bal += 1
    elif ch == '}': bal -= 1
print("final brace balance:", bal)
keys = re.findall(r'^\s*"([^"]+)":\s*\{', raw, re.MULTILINE)
print("top-level entries:", len(keys))
# Isolate which block is unbalanced
depth = 0
lines = raw.splitlines()
cur = ""
for i, line in enumerate(lines, 1):
    stripped_line = re.sub(r'"(?:[^"\\]|\\.)*"', '""', line)
    for ch in stripped_line:
        if ch == '{':
            depth += 1
            if depth == 1: cur = line.strip()[:60]
        elif ch == '}':
            depth -= 1
            if depth < 0:
                print(f"NEG depth at line {i}: {line}")
                depth = 0
    if i > 200: break
print("depth at line 200:", depth)
