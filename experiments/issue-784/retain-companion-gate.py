"""Retain complete failed companion gate attempts and exact command boundaries."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head.startswith('b7f8826b1')
receipts = []
for name in ['current-companion-full-gate-retry',
             'current-companion-closed-pages-full-gate']:
    receipt = json.loads((base / (name + '.memory.json')).read_bytes())
    assert receipt['stopped'] and receipt['exitCode'] == 143
    assert receipt['stopThresholdBytes'] == 2866933760
    for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds'],
                receipt['completedFingerprintPageAdvice']['pid']]:
        assert not Path('/proc', str(pid)).exists()
    receipts.append(receipt)
events = []
for line in (base / 'current-companion-closed-pages-full-gate.log').read_text().splitlines():
    if line.startswith('{'):
        record = json.loads(line)
        if record.get('event') == 'javascript-gate-command':
            events.append(record)
assert len(events) == 21
assert all(row['status'] == 0 for row in events if row['state'] == 'finish')
assert events[-1]['command'] == 'npm run native:test --prefix js'
assert events[-1]['state'] == 'start'
paths = [Path(__file__), Path('scripts/check-js-first-local.mjs')]
paths.extend(Path('experiments/issue-784') / name for name in [
    'run-observed-check.py', 'completed-fingerprint-pages.py',
    'release-inactive-repository-pages.py', 'advise-inactive-git-pack-pages.py',
    'with-child-reaper.py'])
for pattern in ['current-companion-full-gate*',
                'current-companion-closed-pages-full-gate*',
                'current-companion-gate-closed-git-pages*',
                'current-companion-gate-complete-closed-pages*']:
    paths.extend(base.glob(pattern))
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-companion-gate-observations-v1', headSha=head,
    members=members, receipts=receipts, commandEvents=events,
    childHeapMiB=384, parentHeapMiB=128, passedStages=['lint'],
    interruptedStage='node-tests',
    unrunStages=['bun-tests', 'typescript', 'parity', 'translation', 'reverse-translation'],
    preconditionRefusalHasNoChild=True, originalDeadlinesChanged=False,
    fullGatePassed=False, rustExecuted=False, newlyExecutableProductionFunctions=0)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-companion-gate.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps(dict(path=str(target), storedBytes=len(packed), members=len(members),
                     completeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))
