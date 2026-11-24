"""Review original terminal gate receipts without qualifying failed stages."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
head = '17aea691976747ef8d8318ab1aa7994789b023ee'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip() == head
changes = subprocess.check_output(['git', 'diff', '--name-only'], cwd=root).decode().splitlines()
assert set(changes) <= {'experiments/issue-784/collect-resolver-evidence.py'}
untracked = subprocess.check_output(
    ['git', 'ls-files', '--others', '--exclude-standard'], cwd=root).decode().splitlines()
assert set(untracked) <= {'experiments/issue-784/inspect-current-isolated-gate.py'}
log = base / 'current-isolated-full-gate.log'
raw = log.read_bytes()
lines = raw.decode().splitlines()
memory = json.loads((base / 'current-isolated-full-gate.memory.json').read_bytes())
assert memory['exitCode'] == 143 and memory['stopped'] and not memory['interrupted']
assert memory['containerLimitBytes'] == 3135369216
assert all(not Path('/proc/' + str(pid)).exists()
           for pid in [memory['pid'], *memory['stoppedOwnedProcessIds']])


def identity(path):
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    return {'path': str(path.relative_to(root)), 'bytes': path.stat().st_size,
            'sha256': digest}


attempts = []
for value in re.findall(r'^Complete Node deadline evidence: (.+)$', raw.decode(), re.M):
    path = Path(value)
    assert path.parent == root / 'js/node_modules/.node-case-deadlines'
    terminal = json.loads((path / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    for row in terminal['logs']:
        actual = identity(path / row['path'])
        assert actual['bytes'] == row['bytes'] == row['observedBytes']
        assert actual['sha256'] == row['sha256'] == row['readback']['sha256']
    if terminal['audit']:
        actual = identity(path / terminal['audit']['path'])
        assert actual['bytes'] == terminal['audit']['bytes']
        assert actual['sha256'] == terminal['audit']['sha256']
    attempts.append({'path': str(path.relative_to(root)), 'terminal': terminal,
                     'files': [identity(p) for p in sorted(path.iterdir()) if p.is_file()]})
assert len(attempts) == 3
assert attempts[0]['terminal']['auditSummary']['passed']
native = attempts[1]['terminal']
assert not native['auditSummary']['passed']
assert native['auditSummary']['durationBreaches'] == 1
assert '133321.867865ms exceeds unchanged source-declared 60000ms' in native['auditSummary']['errors'][0]
assert native['allSelectedWholeFiles'] == ['tools/translation/js-to-rust/test/native-typescript.test.mjs']
forward = attempts[2]['terminal']
assert forward['audit'] is None and forward['interrupted'] == 'SIGTERM'
assert len(forward['allSelectedWholeFiles']) == 656
stages = [dict(line=i + 1, stage=x.removeprefix('JavaScript stage: '))
          for i, x in enumerate(lines) if x.startswith('JavaScript stage: ')]
assert [row['stage'] for row in stages] == [
    'lint', 'node-tests', 'bun-tests', 'typescript', 'parity', 'translation']
result = {
    'sourceHead': head, 'log': identity(log), 'logLines': len(lines),
    'enteredStages': stages,
    'passed': ['lint and 61 controls', '259 native Node cases', '259 native Bun cases',
               '9 audited deadline controls', 'public and native type checking',
               'native TypeScript freshness', 'strict TypeScript 5.9.3: 165 files',
               '121 parity acceptance cases'],
    'failed': {'typescript': native['auditSummary']['errors'],
               'parity': ['stale account_routing_policy.rs hash', '441 feature gaps',
                          '12345 carried items; runtimeParity=false']},
    'nativeBehavior': 'All 9 TAP cases finish; the independent original deadline audit fails.',
    'interrupted': 'Forward cohort stops during startup; no TAP or terminal case audit.',
    'unrun': ['remaining TypeScript commands after native behavior',
              'remaining forward commands', 'reverse translation'],
    'completeNodeAttempts': attempts, 'memory': memory,
    'allOwnedProcessesReaped': True, 'fullGatePassed': False, 'rustExecuted': False,
}
with (base / 'current-isolated-full-gate-inspection.json').open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({key: result[key] for key in [
    'sourceHead', 'log', 'logLines', 'enteredStages', 'passed', 'failed',
    'nativeBehavior', 'interrupted', 'unrun', 'allOwnedProcessesReaped']}))
