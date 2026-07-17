import re
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
raw = (P/".ua/tmp/sem-batch13.json").read_text("utf-8")
lines = raw.splitlines()
depth = 0
for i, line in enumerate(lines, 1):
    # strip strings
    tmp = re.sub(r'"(?:[^"\\]|\\.)*"', '""', line)
    opens = tmp.count('{')
    closes = tmp.count('}')
    net = opens - closes
    if i <= 30 and net != 0:
        print("L%d: net%+d depth->%d: %r" % (i, net, depth+net, line.rstrip()))
    depth += net
