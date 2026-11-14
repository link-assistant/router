"""Preserve complete failed and passed proof-cost history receiving evidence."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
paths = []
for label, status in [('current-proof-cost-history-node', 1),
                      ('current-proof-cost-history-composed-node', 0),
                      ('current-proof-cost-history-composed-bun', 0)]:
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == status and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.extend(base / (label + suffix) for suffix in
                 ['.log', '.memory.json', '.observer.log'])
for name, status in [('complete-0aISGz', 1), ('complete-WJDI1r', 0)]:
    directory = root / 'js/node_modules/.node-case-deadlines' / name
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    assert terminal['exitCode'] == status and terminal['childClosed']
    assert terminal['groupCleanup']['complete']
    assert terminal['auditSummary']['durationBreaches'] == 0
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths.extend(sorted(path for path in directory.iterdir() if path.is_file()))
paths.extend(root / name for name in [
    'tools/translation/test/current-proof-cost-source-history.mjs',
    'tools/translation/test/current-proof-cost-source-history.test.mjs',
    'tools/translation/test/private-native-proof-cost-scope.test.mjs',
    'tools/translation/test/private-native-proof-retained-costs.test.mjs',
    'tools/translation/proof-scanner-source-evolution.mjs',
    'tools/translation/private-native-proof-json.mjs',
    'tools/translation/prepare-invocation-local-freezer.mjs',
    'tools/translation/test/fixtures/current-receiving-source-history.mjs',
    'experiments/issue-784/capture-proof-cost-history-evidence.py',
])
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'encoding': 'base64', 'content': base64.b64encode(raw).decode()})
packet = {'schema': 'complete-proof-cost-history-receiving-evidence-v1',
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
          'uncommittedSourceDraft': True, 'members': members,
          'allDecodedOriginalsVerified': True, 'fullGateQualified': False,
          'runtimeParity': False, 'rustExecuted': False}
target = root / 'docs/case-studies/issue-784/evidence/current-proof-cost-history-receiving.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(packet, separators=(',', ':')).encode(), mtime=0))
decoded = json.loads(gzip.decompress(target.read_bytes()))
for row in decoded['members']:
    data = base64.b64decode(row['content'], validate=True)
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
print(json.dumps({'packet': str(target.relative_to(root)), 'bytes': target.stat().st_size,
                  'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                  'completeMembers': len(members), 'completeRawBytes': sum(row['bytes'] for row in members)}))
