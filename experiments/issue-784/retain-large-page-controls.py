"""Retain whole finite controls before attempting the changed gate observer."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
paths = sorted(path for path in base.glob('current-large-pages-*') if path.is_file())
paths += [Path('experiments/issue-784') / name for name in [
    'release-inactive-repository-pages.py', 'run-observed-check.py',
    'observed-check-controls.py', 'check-large-page-advice.py',
    'retain-large-page-controls.py']]
members = []
for path in paths:
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
assert json.loads((base / 'current-large-pages-observer-controls.json').read_bytes())['allPassed']
assert json.loads((base / 'current-large-pages-file-controls.json').read_bytes())['allPassed']
record = {'schema': 'complete-large-closed-page-advice-controls-v1', 'members': members,
          'minimumTrackedFileBytes': 131072, 'minimumIntervalSeconds': 3,
          'maximumInvocations': 12, 'stopThresholdBytes': 2866933760,
          'originalTestClocksPaused': False, 'completeGateQualified': False,
          'trackedRegularFiles': 49072, 'trackedRegularBytes': 1866477766,
          'largeRegularFiles': 1273, 'largeRegularBytes': 1427996654,
          'censusIsLaunchSnapshot': False}
raw = json.dumps(record, separators=(',', ':')).encode()
target = Path('docs/case-studies/issue-784/evidence/current-large-page-controls.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': target.stat().st_size,
                  'members': len(members), 'wholeReadbackVerified': True}))
