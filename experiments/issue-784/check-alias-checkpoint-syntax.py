"""Parse every changed complete JavaScript source without evaluating imports."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import time

base = '17c7dd9942814f2a6a17eee135016e5941f04f15'
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
paths = subprocess.check_output(['git', 'diff', '--name-only', '--diff-filter=ACMR',
                                 base, head, '--', 'tools', 'scripts', 'js', '.github'], text=True).splitlines()
rows = []
for name in paths:
    if Path(name).suffix not in ['.mjs', '.js', '.cjs']:
        continue
    raw = Path(name).read_bytes()
    assert len(raw.splitlines()) < 1000
    started = time.monotonic()
    run = subprocess.run(['experiments/issue-784/toolchain/node20/bin/node', '--check', name],
                         capture_output=True, text=True)
    rows.append({'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                 'exitCode': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr,
                 'seconds': time.monotonic() - started})
packet = {'schema': 'complete-alias-checkpoint-syntax-v1', 'base': base, 'head': head,
          'rows': rows, 'importsEvaluated': False, 'fullGateQualified': False}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
target = Path('docs/case-studies/issue-784/evidence/current-alias-checkpoint-syntax.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
assert all(row['exitCode'] == 0 for row in rows)
print(json.dumps({'path': str(target), 'completeJavaScriptFilesParsed': len(rows),
                  'failures': sum(row['exitCode'] != 0 for row in rows), 'head': head,
                  'fullGateQualified': False}))
