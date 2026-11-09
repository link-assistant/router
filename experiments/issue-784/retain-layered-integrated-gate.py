"""Retain the complete observed gate, including its original deadline evidence."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
prefix = 'current-layered-integrated-gate'
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == 'ec90f0754fb04b411f7194b7e731be7fec52ec86'
receipt = json.loads((base / (prefix + '.memory.json')).read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == 143
assert receipt['stopThresholdBytes'] == 2866933760
assert receipt['completedFingerprintPageAdvice']['exitCode'] == 0
for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds'],
            receipt['completedFingerprintPageAdvice']['pid']]:
    assert not Path('/proc/' + str(pid)).exists()
paths = list(base.glob(prefix + '*'))
paths += [Path('scripts/check-js-first-local.mjs'), Path(__file__),
          Path('experiments/issue-784/run-observed-check.py'),
          Path('experiments/issue-784/completed-fingerprint-pages.py'),
          Path('experiments/issue-784/with-child-reaper.py'),
          Path('docs/case-studies/issue-784/current-layered-integrated-gate.md')]
folder = Path('js/node_modules/.node-case-deadlines/complete-hiy5ZC')
terminal = json.loads((folder / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary']['passed']
paths.extend(path for path in folder.iterdir() if path.is_file())
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-layered-receiving-integrated-gate-v1',
              headSha=head, receipt=receipt, members=members,
              passedStages=['lint', 'node-tests', 'bun-tests'],
              interruptedStage='typescript',
              unrunStages=['parity', 'translation', 'reverse-translation'],
              fullGatePassed=False, newlyExecutableProductionFunctions=0,
              runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence') / (prefix + '.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps(dict(path=str(target), storedBytes=len(packed),
                      members=len(members), completeReadbackVerified=True,
                      evidenceBytesAfter=before + len(packed))))
