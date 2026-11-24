"""Preserve whole fingerprint diagnostics and every focused test attempt."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-fingerprint-trace.json.gz')
members = []


def retain(path, raw):
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})


for prefix in ['current-gate-progress-', 'current-large-pages-gate.',
               'current-large-pages-gate.memory-', 'current-fingerprint-trace-gate.',
               'current-fingerprint-trace-gate.memory-', 'current-gate-trace-preflight-']:
    for path in sorted(base.glob(prefix + '*')):
        if path.is_file() and str(path) not in {row['path'] for row in members}:
            retain(path, path.read_bytes())
for name in ['check-js-first-local.mjs', 'test/check-js-first-local.test.mjs']:
    path = Path('scripts') / name
    retain('git:3fee67242:' + str(path),
           subprocess.check_output(['git', 'show', '3fee67242:' + str(path)]))
    retain(path, path.read_bytes())
for name in ['run-observed-check.py', 'release-inactive-repository-pages.py',
             'retain-fingerprint-trace.py']:
    path = Path('experiments/issue-784') / name
    retain(path, path.read_bytes())
for directory in ['complete-E6dgmY', 'complete-UoM4uz', 'complete-cnvyM5', 'complete-rTkGSn']:
    audit = Path('js/node_modules/.node-case-deadlines') / directory
    terminal = json.loads((audit / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    for path in sorted(audit.rglob('*')):
        if path.is_file():
            retain(path, path.read_bytes())
focused = json.loads((base / 'current-gate-progress-node-4.memory.json').read_bytes())
gate = json.loads((base / 'current-fingerprint-trace-gate.memory.json').read_bytes())
earlier = json.loads((base / 'current-large-pages-gate.memory.json').read_bytes())
assert focused['exitCode'] == 0 and not focused['stopped']
assert gate['exitCode'] == earlier['exitCode'] == 143
assert gate['stopped'] and earlier['stopped']
for row in [focused, gate, earlier]:
    assert not Path('/proc/' + str(row['pid'])).exists()
assert json.loads((Path('js/node_modules/.node-case-deadlines/complete-rTkGSn') / 'terminal.json').read_bytes())['auditSummary']['passed']
log = (base / 'current-fingerprint-trace-gate.log').read_text()
assert 'JavaScript stage:' not in log
trace = [json.loads(line) for line in log.splitlines()]
assert all(row['event'] == 'javascript-gate-fingerprint' for row in trace)
assert trace[0]['state'] == 'start' and not any(row['state'] == 'complete' for row in trace)
record = {'schema': 'complete-optional-gate-fingerprint-trace-v1', 'members': members,
          'traceDefaultOff': True, 'allFingerprintInputsAndFramingRetained': True,
          'completeFocusedCases': 13, 'focusedNodeVersion': '20.20.2',
          'typescriptVersion': '5.9.3', 'allOriginalDeadlinesRetained': True,
          'guardBytes': gate['stopThresholdBytes'], 'gate': gate,
          'lastCompleteTraceRecord': trace[-1], 'allSevenGateStagesUnrun': True,
          'isImmutableLaunchSnapshot': False, 'fullGatePassed': False,
          'runtimeParity': False, 'productionExecutableGain': 0, 'rustExecuted': False}
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
