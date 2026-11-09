"""Retain every entered stage and the exact interrupted full-gate boundary."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == 'ef601cecf4766f9ab3527ea0ab898744ef37a24c'
receipt = json.loads((base / 'current-ef601-full-gate-resource.json').read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == receipt['childExitCode'] == 143
assert receipt['stopThresholdBytes'] == 2866933760
assert receipt['stopSampledCgroupBytes'] == 2870001664
assert receipt['completedFingerprintPageAdvice']['exitCode'] == 0
for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds'],
            receipt['completedFingerprintPageAdvice']['pid']]:
    assert not Path('/proc', str(pid)).exists()
events, source_events = [], []
for line in (base / 'current-ef601-full-gate.log').read_text().splitlines():
    if line.startswith('{'):
        row = json.loads(line)
        if row.get('event') == 'javascript-gate-command':
            events.append(row)
        if row.get('event') == 'deadline-source-audit':
            source_events.append(row)
assert len(events) == 41
finished = [row for row in events if row['state'] == 'finish']
assert len(finished) == 20
assert {row['stage'] for row in finished if row['status'] != 0} == {'typescript', 'parity'}
assert events[-1]['stage'] == 'translation' and events[-1]['state'] == 'start'
assert source_events[-1]['selectedFiles'] == 697
assert source_events[-1]['totalSourceBytes'] == 11324176
roots = [Path('js/node_modules/.node-case-deadlines') / name for name in
         ['complete-yWdqun', 'complete-uybzDN', 'complete-FWWxxE']]
audits = []
for directory in roots:
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    deadline_path = directory / 'case-deadlines.json'
    deadline = json.loads(deadline_path.read_bytes()) if deadline_path.exists() else None
    audits.append(dict(path=str(directory), terminal=terminal, deadline=deadline))
assert audits[0]['deadline']['passed']
assert not audits[1]['deadline']['passed']
assert audits[2]['deadline'] is None
paths = [Path(__file__), *base.glob('current-ef601-full-gate*')]
paths.extend(path for directory in roots for path in directory.rglob('*'))
paths.extend(Path('experiments/issue-784') / name for name in [
    'run-observed-check.py', 'completed-fingerprint-pages.py',
    'release-inactive-repository-pages.py', 'with-child-reaper.py'])
paths.extend(Path('scripts') / name for name in [
    'check-js-first-local.mjs', 'run-node-tests.mjs', 'node-case-deadlines.mjs',
    'test/node-case-deadlines.test.mjs', 'check-router-parity.mjs'])
paths.append(Path('tools/translation/js-to-rust/test/native-typescript.test.mjs'))
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-ef601-gate-attempt-v1', headSha=head,
    members=members, resourceReceipt=receipt, commandEvents=events,
    childHeapMiB=512, parentHeapMiB=128, compilerVersion='5.9.3',
    passedStages=['lint', 'node-tests', 'bun-tests'],
    failedStages=['typescript', 'parity'], interruptedStage='translation',
    passedAcceptanceCases=121, preparedForwardSourceFiles=697,
    preparedForwardSourceBytes=11324176, deadlineAudits=audits,
    unrunStages=['reverse-translation'], laterCommandsInFailedStagesUnrun=True,
    originalDeadlinesChanged=False, allOwnedProcessesReaped=True,
    finalFingerprintReached=False, fullGatePassed=False,
    rustExecuted=False, newlyExecutableProductionFunctions=0)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
budget_roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
                Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for directory in budget_roots for path in directory.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-ef601-gate.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps(dict(path=str(target), members=len(members), storedBytes=len(packed),
    completeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))
