"""Retain the complete unchanged gate attempt, including its lint interruption."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == 'f08eee0927b9f3b7c2081bf6d3d4fcf975adf644'
receipt = json.loads((base / 'current-f08eee-gate-resource.json').read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == receipt['childExitCode'] == 143
assert receipt['stopThresholdBytes'] == 2866933760
assert receipt['completedFingerprintPageAdvice']['exitCode'] == 0
for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds'],
            receipt['completedFingerprintPageAdvice']['pid']]:
    assert not Path('/proc', str(pid)).exists()
events = []
for line in (base / 'current-f08eee-gate.log').read_text().splitlines():
    if line.startswith('{'):
        row = json.loads(line)
        if row.get('event') == 'javascript-gate-command':
            events.append(row)
assert len(events) == 11
finished = [row for row in events if row['state'] == 'finish']
assert len(finished) == 5 and all(row['status'] == 0 for row in finished)
assert events[-1]['command'] == 'node --test scripts/test/check-js-first-workflows.test.mjs'
assert events[-1]['state'] == 'start' and events[-1]['stage'] == 'lint'
paths = [Path(__file__), *base.glob('current-f08eee-gate*')]
paths.extend(Path('experiments/issue-784') / name for name in [
    'run-observed-check.py', 'completed-fingerprint-pages.py',
    'release-inactive-repository-pages.py', 'with-child-reaper.py'])
paths.extend(Path('scripts') / name for name in [
    'check-js-first-local.mjs', 'lint-js-first.mjs',
    'test/check-js-first-workflows.test.mjs',
    'test/run-bun-forward-files.test.mjs',
    'test/run-bun-reverse-files.test.mjs', 'test/bun-reverse-inputs.test.mjs'])
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-f08eee-gate-attempt-v1', headSha=head,
    members=members, resourceReceipt=receipt, commandEvents=events,
    childHeapMiB=192, parentHeapMiB=128, passedStages=[],
    passedCommands=[row['command'] for row in finished], interruptedStage='lint',
    unrunStages=['node-tests', 'bun-tests', 'typescript', 'parity',
                 'translation', 'reverse-translation'],
    originalDeadlinesChanged=False, allOwnedProcessesReaped=True,
    fullGatePassed=False, rustExecuted=False, newlyExecutableProductionFunctions=0)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-f08eee-gate.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps(dict(path=str(target), members=len(members), storedBytes=len(packed),
                     completeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))
