"""Preserve complete closed evidence-retirement receipts and their actual tools."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
receipt = json.loads((base / 'current-complete-duplicate-retirement.json').read_bytes())
assert len(receipt['rows']) == 1107 and len(receipt['archives']) == 13
assert receipt['completeOriginalsRetained']
assert receipt['logicalBytesReclaimed'] == 19152317
assert receipt['allocatedBytesReclaimed'] == 22192128
assert all(row['completeMemberReadbackVerified'] and not (root / row['path']).exists()
           for row in receipt['rows'])
paths = [base / name for name in [
    'current-complete-duplicate-retirement-plan.json',
    'current-complete-duplicate-retirement.json',
    'current-complete-duplicate-retirement.log',
    'current-ci-evidence-relocation.log',
    'current-ci-custody-capture.log',
]]
paths.append(root / 'docs/case-studies/issue-784/evidence/ci-17c7/current-17c7-source-review-compression.json')
paths += [root / 'experiments/issue-784' / name for name in [
    'collect-current-ci-snapshot.py', 'collect-current-completed-artifacts.py',
    'index-current-ci-failures.py', 'compress-inactive-raw-evidence.py',
    'retire-verified-published-ci-duplicates.py', 'retain-current-ci-containers.py',
    'capture-current-ci-custody.py',
]]
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink(), str(path)
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'encoding': 'base64', 'content': base64.b64encode(raw).decode()})
packet = {'schema': 'complete-current-ci-custody-evidence-v1',
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
          'members': members, 'wholeOriginalsRetained': True,
          'completeGatePassed': False, 'rustExecuted': False}
target = root / 'docs/case-studies/issue-784/evidence/current-ci-custody.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(packet, separators=(',', ':')).encode(), mtime=0))
decoded = json.loads(gzip.decompress(target.read_bytes()))
for row in decoded['members']:
    raw = base64.b64decode(row['content'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps({'packet': str(target.relative_to(root)), 'bytes': target.stat().st_size,
                  'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                  'members': len(members), 'rawBytes': sum(row['bytes'] for row in members)}))
