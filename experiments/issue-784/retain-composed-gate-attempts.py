"""Retain both complete failed gate attempts and their resource boundaries."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = sorted(list(base.glob('current-composed-full-gate*'))
               + list(base.glob('current-corrected-full-gate*')))
paths += [base / name for name in [
    'current-completed-deadline-files-retention.log',
    'current-completed-deadline-files-retention-2.log',
    'current-published-history-retirement.log',
]]
paths += [Path(name) for name in [
    'scripts/check-js-first-local.mjs',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
    'experiments/issue-784/completed-fingerprint-pages.py',
    'experiments/issue-784/retain-completed-deadline-files.py',
    'experiments/issue-784/retire-published-performance-vectors.py',
    'docs/case-studies/issue-784/current-composed-gate-attempts.md',
]]
members = []
for path in paths:
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
attempts = []
for prefix, head in [('current-composed-full-gate', 'a3d64c3cb'),
                     ('current-corrected-full-gate', '038e24b94')]:
    receipt = json.loads((base / (prefix + '.memory.json')).read_bytes())
    assert receipt['stopped'] and receipt['exitCode'] == 143
    assert receipt['stopThresholdBytes'] == 2866933760
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    attempts.append(dict(head=subprocess.check_output(['git', 'rev-parse', head], text=True).strip(),
                         receipt=receipt, inheritedChildHeapMiB=128,
                         npmAvailable=prefix == 'current-corrected-full-gate'))
record = dict(schema='complete-residual-batch-gate-attempts-v1',
              attempts=attempts, members=members, nodeVersion='20.20.2',
              bunVersion='1.4.4', installedTypeScriptVersion='5.9.3',
              originalDeadlinesChanged=False, fullGatePassed=False,
              newlyExecutableProductionFunctions=0, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
target = Path('docs/case-studies/issue-784/evidence/current-composed-gate-attempts.json.gz')
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(p.stat().st_size for root in roots for p in root.rglob('*')
             if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
assert before + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     completeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))
