"""Preserve the failed whole file; its original evidence logger stays enabled.

The first immutable packet incorrectly recorded logging as disabled. Its full
members and the separate current-matches-logging-label audit retain that error.
"""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
folder = Path('js/node_modules/.node-case-deadlines/complete-MxR6SR')
terminal = json.loads((folder / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['exitCode'] != 0 and terminal['auditSummary'] is None
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
paths = {path for path in folder.rglob('*') if path.is_file()}
paths |= {path for path in base.glob('current-owned-matches-default-node.*') if path.is_file()}
paths |= {Path(__file__), Path('tools/translation/test/router-core-matches.test.mjs'),
          Path('tools/translation/test/fixtures/geolocation-module-source-composition.mjs')}
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
record = {'schema': 'complete-default-matches-receiving-attempt-v1',
          'members': members, 'optionalFullVectorLoggingEnabled': True,
          'completedBehavioralCases': 0, 'finalParentCaseReached': False,
          'heapMiB': 512, 'nodeVersion': '20.20.2', 'typescriptVersion': '5.9.3',
          'nativeStackIncludesJsonStringifier': True,
          'exactJavaScriptSerializationCallSiteKnown': False,
          'fullGatePassed': False, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, names in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in names
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-default-matches-attempt.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'wholeFileQualified': False, 'censusAfterBytes': total + len(packed)}))
