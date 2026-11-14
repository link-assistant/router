"""Retain complete publication review streams and their narrow verification scope."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

target = Path('docs/case-studies/issue-784/evidence/current-alias-checkpoint-review.json.gz')
assert not target.exists()
sha = lambda raw: hashlib.sha256(raw).hexdigest()
base = 'ci-logs/issue-784-restart-2/'
paths = [base + name for name in [
    'current-alias-checkpoint-full-production.diff.gz',
    'current-alias-checkpoint-source-review.diff.gz',
    'current-alias-checkpoint-gh-diff-names.txt',
    'current-alias-checkpoint-gh-diff-names.stderr.log',
    'current-alias-checkpoint-compression.json', 'current-alias-checkpoint-compression.log',
    'current-alias-checkpoint-feedback.log', 'current-alias-checkpoint-syntax.log',
    'current-alias-reader-fetch.log',
]] + [
    'docs/case-studies/issue-784/current-alias-checkpoint.md',
    'experiments/issue-784/alias-checkpoint-plan.md',
    'experiments/issue-784/capture-alias-checkpoint-feedback.py',
    'experiments/issue-784/check-alias-checkpoint-syntax.py',
    'experiments/issue-784/compress-inactive-raw-evidence.py',
    'experiments/issue-784/capture-alias-checkpoint-review.py',
]
diff = gzip.decompress(Path(paths[0]).read_bytes())
assert len(diff) == 377105 and len(diff.splitlines()) == 2906
assert sha(diff) == '9c7776d6dfccc1e6262692f62665f87eea2f921a3c5a9927f8b9e5f089335761'
assert diff == subprocess.check_output(['git', 'diff', '17c7dd994..HEAD', '--', 'tools', 'scripts', 'js', '.github'])
members = []
for name in paths:
    raw = Path(name).read_bytes()
    members.append({'path': name, 'bytes': len(raw), 'sha256': sha(raw),
                    'base64': base64.b64encode(raw).decode()})
external = []
for name in ['current-alias-checkpoint-feedback', 'current-alias-checkpoint-syntax']:
    path = Path('docs/case-studies/issue-784/evidence/' + name + '.json.gz')
    packed = path.read_bytes()
    raw = gzip.decompress(packed)
    value = json.loads(raw)
    if name.endswith('syntax'):
        assert len(value['rows']) == 45 and all(row['exitCode'] == 0 for row in value['rows'])
    external.append({'path': str(path), 'bytes': len(packed), 'sha256': sha(packed),
                     'decodedBytes': len(raw), 'decodedSha256': sha(raw)})
packet = {'schema': 'complete-alias-checkpoint-review-v1', 'members': members,
          'external': external, 'fullGateQualified': False, 'rustExecuted': False,
          'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
size = 0
for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(name):
        if parent == 'experiments/issue-784':
            children[:] = [child for child in children if child != 'toolchain']
        size += sum((Path(parent) / item).stat().st_size for item in files
                    if not (Path(parent) / item).is_symlink())
assert size + len(packed) < 500000000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and sha(restored) == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'sha256': sha(packed),
                  'censusAfterBytes': size + len(packed), 'completeMembers': len(members)}))
