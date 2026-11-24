"""Retain complete command-trace controls and the interrupted original gate."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == 'b93129482ff79d06efca55b95f01c1b1fae78243'
receipt = json.loads((base / 'current-command-progress-full-gate.memory.json').read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == 143
assert receipt['stopThresholdBytes'] == 2866933760
assert receipt['completedFingerprintPageAdvice']['exitCode'] == 0
for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds'],
            receipt['completedFingerprintPageAdvice']['pid']]:
    assert not Path('/proc', str(pid)).exists()
paths = []
for pattern in ['current-command-progress-*', 'current-native-ts-256.*',
                'current-native-regen-256.*']:
    paths.extend(base.glob(pattern))
paths.extend(map(Path, ['scripts/check-js-first-local.mjs',
    'scripts/test/check-js-first-local.test.mjs',
    'scripts/test/check-profile-typescript.test.mjs', __file__,
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/completed-fingerprint-pages.py',
    'experiments/issue-784/with-child-reaper.py',
    'docs/case-studies/issue-784/current-command-progress.md']))
for name in ['complete-HDXFvv', 'complete-F1z1E8', 'complete-bBH2Td']:
    folder = Path('js/node_modules/.node-case-deadlines') / name
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    paths.extend(path for path in folder.iterdir() if path.is_file())
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-command-progress-gate-evidence-v1', headSha=head,
    receipt=receipt, members=members, passedStages=['lint', 'node-tests', 'bun-tests'],
    interruptedStage='typescript',
    interruptedCommand='node scripts/regenerate-native-typescript.mjs --check',
    unrunStages=['parity', 'translation', 'reverse-translation'],
    fullGatePassed=False, runtimeParity=False, rustExecuted=False,
    newlyExecutableProductionFunctions=0)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-command-progress-gate.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps(dict(path=str(target), storedBytes=len(packed), members=len(members),
                     completeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))
