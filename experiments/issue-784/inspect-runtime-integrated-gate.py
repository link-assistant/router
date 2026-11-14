"""Inspect complete local terminal evidence without qualifying interrupted stages."""
import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
log = base / 'runtime-import-integrated-full-gate.log'
raw = log.read_bytes()
lines = raw.decode().splitlines()
memory = json.loads((base / 'runtime-import-integrated-full-gate.memory.json').read_bytes())
assert memory['exitCode'] == 143 and memory['stopped'] and not memory['interrupted']
assert memory['containerLimitBytes'] == 3135369216
attempts = []
for value in re.findall(r'^Complete Node deadline evidence: (.+)$', raw.decode(), re.M):
    path = Path(value)
    assert path.parent == root / 'js/node_modules/.node-case-deadlines'
    terminal = json.loads((path / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    files = []
    for original in sorted(path.iterdir()):
        data = original.read_bytes()
        files.append({'path': str(original.relative_to(root)), 'bytes': len(data),
                      'sha256': hashlib.sha256(data).hexdigest()})
    attempts.append({'path': str(path.relative_to(root)), 'terminal': terminal, 'files': files})
assert len(attempts) == 2
assert attempts[0]['terminal']['auditSummary']['passed']
assert attempts[1]['terminal']['audit'] is None
assert attempts[1]['terminal']['interrupted'] == 'SIGTERM'
assert not Path('/proc/' + str(memory['pid'])).exists()
cleanup = json.loads((base / 'runtime-import-integrated-full-gate-daemon-cleanup.json').read_bytes())
assert not Path('/proc/' + str(cleanup['pid'])).exists()
result = {
    'sourceHead': '21caf33cf798bcb90a00778fc538664f2f3cb4cc',
    'log': {'path': str(log.relative_to(root)), 'lines': len(lines), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()},
    'reviewedChunks': [{'firstLine': at + 1, 'lastLine': min(at + 1500, len(lines))}
                       for at in range(0, len(lines), 1500)],
    'enteredStages': re.findall(r'^JavaScript stage: (.+)$', raw.decode(), re.M),
    'passed': ['lint and all 61 controls', '259 native Node cases', '259 native Bun cases',
               '9 audited deadline controls', 'public type checking', 'native type checking',
               'native TypeScript freshness', 'strict native TypeScript compilation (165 files)'],
    'interrupted': 'native-typescript.test.mjs: four TAP passes, no complete audit',
    'unrun': ['remaining TypeScript commands', 'parity', 'translation', 'reverse-translation'],
    'memory': memory, 'completeNodeAttempts': attempts, 'detachedDaemonCleanup': cleanup,
    'allOwnedProcessesReaped': True, 'fullGatePassed': False, 'rustExecuted': False,
    'timeScope': 'Observer elapsed time includes waiting for detached-daemon cleanup.',
}
with (base / 'runtime-import-integrated-full-gate-inspection.json').open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({key: result[key] for key in ['sourceHead', 'log', 'passed', 'interrupted', 'unrun']}))
