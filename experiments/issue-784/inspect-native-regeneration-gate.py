"""Read every original gate attempt and preserve failures without qualification."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--head', required=True)
parser.add_argument('--label', choices=['native-regeneration', 'matrix-draft'],
                    default='native-regeneration')
args = parser.parse_args()
assert re.fullmatch('[a-f0-9]{40}', args.head)
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip() == args.head
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=root)
log = base / (args.label + '-full-gate.log')
raw = log.read_bytes()
lines = raw.decode().splitlines()
memory = json.loads((base / (args.label + '-full-gate.memory.json')).read_bytes())
assert memory['containerLimitBytes'] == 3135369216
assert memory['command'] == ['node', '--max-old-space-size=512', 'scripts/check-js-first-local.mjs']
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
stages = [dict(line=i + 1, stage=value.removeprefix('JavaScript stage: '))
          for i, value in enumerate(lines) if value.startswith('JavaScript stage: ')]
observations = [dict(line=i + 1, text=value) for i, value in enumerate(lines)
                if re.search(r'(^not ok|Error|failed|fail [1-9]|exceeds|interrupted|carried|feature gaps|runtimeParity)', value)]
result = {'schema': 'complete-gate-inspection-v1', 'label': args.label,
          'sourceHead': args.head, 'cleanWorktreeAtInspection': True,
          'completeLog': identity(log), 'logLines': len(lines),
          'enteredStages': stages, 'errorObservations': observations,
          'completeNodeAttempts': attempts, 'memory': memory,
          'allOwnedProcessesReaped': True, 'rustExecuted': False,
          'fullGatePassed': False,
          'scope': 'Every reported terminal log and audit read completely. Entering a stage does not prove its completion; missing stages remain unrun. No green gate or Rust authority is inferred.'}
assert memory['exitCode'] != 0
with (base / (args.label + '-full-gate-inspection.json')).open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({'sourceHead': args.head, 'logLines': len(lines), 'enteredStages': stages,
                  'attempts': [{'path': row['path'], 'auditSummary': row['terminal']['auditSummary']}
                               for row in attempts], 'memory': memory,
                  'allOwnedProcessesReaped': True, 'fullGatePassed': False}))
