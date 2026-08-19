import sys, collections
c = collections.Counter()
for line in sys.stdin:
    if 'mobile' in line:
        rest = line.split('mobile', 1)[1]
        # rest like '\src\...\file.tsx: line N, col...'
        fpath = rest.split(': line')[0].strip().lstrip('\\').lstrip('/')
        c[fpath] += 1
for f, n in c.most_common():
    print(f'{n}\t{f}')
