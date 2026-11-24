"""Retain the exact complete gate attempt, including its unfinished fingerprint."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-ascii-checkpoint-gate.json.gz')
receipt = json.loads((base / 'current-inherited-heap-gate.memory.json').read_bytes())
assert receipt['stopped'] and receipt['stopThresholdBytes'] == 2866933760
assert not Path('/proc/' + str(receipt['pid'])).exists()
assert receipt['completedFingerprintPageAdvice']['exitCode'] == 0
assert not Path('/proc/' + str(receipt['completedFingerprintPageAdvice']['pid'])).exists()
log = (base / 'current-inherited-heap-gate.log').read_text()
assert 'JavaScript stage:' not in log
members = []
paths = list(base.glob('current-inherited-heap-gate*')) + [
    Path('experiments/issue-784/run-observed-check.py'),
    Path('experiments/issue-784/completed-fingerprint-pages.py'),
    Path('experiments/issue-784/with-child-reaper.py'),
    Path('experiments/issue-784/retain-ascii-checkpoint-gate.py'),
    Path('scripts/check-js-first-local.mjs'),
    Path('docs/case-studies/issue-784/current-ascii-checkpoint-gate.md'),
]
for path in paths:
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
raw = json.dumps(dict(schema='complete-ascii-checkpoint-gate-attempt-v1',
                     sourceHead='283143a7c695fccecff321df59ddc6c649abb83d',
                     members=members, allSevenStagesUnrun=True,
                     inheritedNodeHeapMiB=512, nodeVersion='20.20.2',
                     originalCommandsAndDeadlinesUnchanged=True,
                     fullGatePassed=False, productionExecutableGain=0,
                     runtimeParity=False, rustExecuted=False), separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        if parent == 'experiments/issue-784':
            directories[:] = [name for name in directories if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500000000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                      completeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
