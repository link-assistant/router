"""Preserve the complete current gate attempt and its original stopping boundary."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == '7582887d33b36e2284688d971fa983c2e4226330'
receipt = json.loads((base / 'current-7582887-full-gate.memory.json').read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == 143
assert receipt['stopThresholdBytes'] == 2866933760
for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds'],
            receipt['completedFingerprintPageAdvice']['pid']]:
    assert not Path('/proc', str(pid)).exists()
events = []
for line in (base / 'current-7582887-full-gate.log').read_text().splitlines():
    if line.startswith('{'):
        row = json.loads(line)
        if row.get('event') == 'javascript-gate-command':
            events.append(row)
assert len(events) == 31
assert all(row['status'] == 0 for row in events if row['state'] == 'finish')
assert events[-1]['command'] == 'node scripts/regenerate-native-typescript.mjs --check'
assert events[-1]['state'] == 'start'
audit = Path('js/node_modules/.node-case-deadlines/complete-A4iiC8')
terminal = json.loads((audit / 'terminal.json').read_bytes())
deadline = json.loads((audit / 'case-deadlines.json').read_bytes())
assert terminal['exitCode'] == 0 and terminal['auditError'] is None
assert deadline['passed'] and deadline['observedCompletedCases'] == 9
paths = [Path(__file__), *audit.rglob('*')]
paths.extend(Path('experiments/issue-784') / name for name in [
    'run-observed-check.py', 'completed-fingerprint-pages.py',
    'release-inactive-repository-pages.py', 'with-child-reaper.py'])
paths.extend(Path('scripts') / name for name in [
    'check-js-first-local.mjs', 'regenerate-native-typescript.mjs',
    'run-node-tests.mjs', 'node-case-deadlines.mjs'])
for pattern in ['current-7582887-*', 'current-next-gate-preflight-*']:
    paths.extend(base.glob(pattern))
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-7582887-gate-attempt-v1', headSha=head,
    members=members, resourceReceipt=receipt, commandEvents=events,
    childHeapMiB=384, parentHeapMiB=128,
    passedStages=['lint', 'node-tests', 'bun-tests'],
    interruptedStage='typescript',
    passedTypeScriptCommands=[row['command'] for row in events
                             if row['stage'] == 'typescript' and row['state'] == 'finish'],
    unrunStages=['parity', 'translation', 'reverse-translation'],
    originalDeadlinesChanged=False, allOwnedProcessesReaped=True,
    fullGatePassed=False, rustExecuted=False, newlyExecutableProductionFunctions=0)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-7582887-gate.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps(dict(path=str(target), members=len(members), storedBytes=len(packed),
                     completeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))
