"""Retain the complete functional receiving result and unchanged deadline failure."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
paths = []
for label, status in [('current-negative-budget-history-node', 1),
                      ('current-negative-budget-history-bun', 0)]:
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == status and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.extend(base / (label + suffix) for suffix in
                 ['.log', '.memory.json', '.observer.log'])
directory = root / 'js/node_modules/.node-case-deadlines/complete-tnQlCb'
terminal = json.loads((directory / 'terminal.json').read_bytes())
assert terminal['exitCode'] == 1 and terminal['childClosed']
assert terminal['groupCleanup']['complete']
assert terminal['auditSummary']['durationBreaches'] == 1
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
paths.extend(sorted(path for path in directory.iterdir() if path.is_file()))
paths.extend(root / name for name in [
    'tools/translation/prepare-negative-budget-proof-json.mjs',
    'tools/translation/prepare-current-receiving-source-history.mjs',
    'tools/translation/test/current-negative-budget-history.test.mjs',
    'tools/translation/test/current-receiving-source-history.test.mjs',
    'tools/translation/test/fixtures/native-proof-json-format.mjs',
    'experiments/issue-784/capture-negative-budget-history-evidence.py',
])
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'encoding': 'base64', 'content': base64.b64encode(raw).decode()})
packet = {'schema': 'complete-negative-budget-history-receiving-evidence-v1',
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
          'uncommittedSourceDraft': True, 'members': members,
          'allDecodedOriginalsVerified': True, 'fullGateQualified': False,
          'completeNodeCheckPassed': False, 'unchangedDeadlineBreaches': 1,
          'runtimeParity': False, 'rustExecuted': False}
target = root / 'docs/case-studies/issue-784/evidence/current-negative-budget-history-receiving.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(packet, separators=(',', ':')).encode(), mtime=0))
decoded = json.loads(gzip.decompress(target.read_bytes()))
for row in decoded['members']:
    data = base64.b64decode(row['content'], validate=True)
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
print(json.dumps({'packet': str(target.relative_to(root)), 'bytes': target.stat().st_size,
                  'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                  'completeMembers': len(members), 'completeRawBytes': sum(row['bytes'] for row in members)}))
