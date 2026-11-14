"""Retain the whole initial-prefix advice experiment and complete gate output."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-completed-fingerprint-pages.json.gz')
members = []


def retain(path, raw):
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})


for path in sorted(base.glob('current-completed-pages-*')):
    if path.is_file():
        retain(path, path.read_bytes())
for name in ['completed-fingerprint-pages.py', 'check-completed-fingerprint-pages.py',
             'run-observed-check.py', 'retain-completed-fingerprint-pages.py']:
    path = Path('experiments/issue-784') / name
    retain(path, path.read_bytes())
retain('git:23b644e0d:experiments/issue-784/run-observed-check.py', subprocess.check_output(
    ['git', 'show', '23b644e0d:experiments/issue-784/run-observed-check.py']))
for name in ['scripts/check-js-first-local.mjs', 'scripts/test/check-js-first-local.test.mjs']:
    path = Path(name)
    retain(path, path.read_bytes())
log = (base / 'current-completed-pages-gate.log').read_text()
audits = [line.removeprefix('Complete Node deadline evidence: ')
          for line in log.splitlines() if line.startswith('Complete Node deadline evidence: ')]
assert len(audits) == 1
audit = Path(audits[0])
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary']['passed'] and terminal['exitCode'] == 0
for path in sorted(audit.rglob('*')):
    if path.is_file():
        retain(path, path.read_bytes())
receipt = json.loads((base / 'current-completed-pages-gate.memory.json').read_bytes())
assert receipt['exitCode'] == 143 and receipt['stopped']
assert receipt['stopThresholdBytes'] == 2866933760
assert not Path('/proc/' + str(receipt['pid'])).exists()
trace = [json.loads(line) for line in log.splitlines()
         if line.startswith('{"event":"javascript-gate-fingerprint",')]
assert trace[-1]['state'] == 'complete' and trace[-1]['totalFiles'] == 49097
assert trace[-1]['completedBytes'] == 1860724960
stages = [line.removeprefix('JavaScript stage: ') for line in log.splitlines()
          if line.startswith('JavaScript stage: ')]
assert stages == ['lint', 'node-tests', 'bun-tests', 'typescript']
advice = json.loads(gzip.decompress((base / 'current-completed-pages-gate.memory-completed-pages.json.gz').read_bytes()))
assert advice['complete'] and advice['completedInputPrefix'] == 49097
assert receipt['completedFingerprintPageAdvice']['exitCode'] == 0
record = {'schema': 'complete-completed-fingerprint-page-experiment-v1',
          'members': members, 'gateReceipt': receipt, 'completedFingerprint': trace[-1],
          'stages': {'lint': 'passed', 'node-tests': '259 passed', 'bun-tests': '259 passed',
                     'typescript': 'interrupted at unchanged cgroup guard',
                     'parity': 'unrun', 'translation': 'unrun', 'reverse': 'unrun'},
          'finiteControlsPassed': 5, 'initialControlFailureRetained': True,
          'typescriptDeadlineAudit': terminal, 'originalCaseClocksPaused': False,
          'fullGatePassed': False, 'semanticAuthority': False,
          'productionExecutableGain': 0, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'wholeReadbackVerified': True, 'evidenceBytesAfter': total + len(packed)}))
