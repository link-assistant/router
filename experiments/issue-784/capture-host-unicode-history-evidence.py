"""Retain complete closed host-history receiving attempts and original audit."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
paths = []
for label in ['current-host-unicode-history-node',
              'current-host-unicode-history-bun',
              'current-host-unicode-history-audited-node']:
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.extend(base / (label + suffix) for suffix in
                 ['.log', '.memory.json', '.observer.log'])
attempt = root / 'js/node_modules/.node-case-deadlines/complete-XSDDdd'
terminal = json.loads((attempt / 'terminal.json').read_bytes())
assert terminal['exitCode'] == 0 and terminal['childClosed']
assert terminal['groupCleanup']['complete']
assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
paths.extend(sorted(path for path in attempt.iterdir() if path.is_file()))
paths.extend(root / name for name in [
    'tools/translation/prepare-core-unicode-predicates.mjs',
    'tools/translation/test/current-host-asset-source-history.mjs',
    'tools/translation/test/current-host-asset-source-history.test.mjs',
    'tools/translation/test/host-named-data-declarations.test.mjs',
    'experiments/issue-784/capture-host-unicode-history-evidence.py',
])
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'encoding': 'base64', 'content': base64.b64encode(raw).decode()})
packet = {'schema': 'complete-host-unicode-history-receiving-evidence-v1',
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
          'uncommittedSourceDraft': True, 'members': members,
          'allDecodedOriginalsVerified': True, 'fullGateQualified': False,
          'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(packet, separators=(',', ':')).encode()
target = root / 'docs/case-studies/issue-784/evidence/current-host-unicode-history-receiving.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
decoded = json.loads(gzip.decompress(target.read_bytes()))
for row in decoded['members']:
    data = base64.b64decode(row['content'], validate=True)
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
print(json.dumps({'packet': str(target.relative_to(root)), 'bytes': target.stat().st_size,
                  'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                  'completeMembers': len(members), 'completeRawBytes': sum(row['bytes'] for row in members)}))
