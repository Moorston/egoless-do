import re
import sys

with open(sys.argv[1], encoding='utf-8') as f:
    lines = f.readlines()

current = ''
counts = {}
for line in lines:
    if 'mobile:lint: D:' in line and 'src' in line:
        m = re.search(r'(apps[/\\\\]mobile[/\\\\]src[/\\\\][^\s]+)', line)
        if m:
            current = m.group(1).replace('\\', '/')
    if 'no-unused-vars' in line:
        counts[current] = counts.get(current, 0) + 1

for f, c in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"{c}\t{f}")
