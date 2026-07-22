import re, os, sys

sys.stdout.reconfigure(encoding='utf-8')

exercise_dir = 'apps/mobile/src/features/exercise'
body_dir = 'apps/mobile/src/features/practice/body'

results = []

for d in [exercise_dir, body_dir]:
    for root, dirs, files in os.walk(d):
        for f in files:
            if not (f.endswith('.tsx') or f.endswith('.ts')):
                continue
            if '.test.' in f or '.spec.' in f:
                continue
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fh:
                for i, line in enumerate(fh, 1):
                    stripped = line.strip()
                    if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
                        continue
                    if stripped.startswith('import ') or stripped.startswith('export '):
                        continue
                    if re.search(r'[一-鿿]', line):
                        if re.search(r"T\('[^']+'\)", line):
                            continue
                        if 'dateStr' in line or 'formatDate' in line or 'getFullYear' in line or 'getMonth' in line:
                            continue
                        results.append(f'{path}:{i}: {stripped[:120]}')

print(f'Total: {len(results)} lines with Chinese (excluding comments, imports, T(), dates)')
print()
for r in results:
    print(r)
