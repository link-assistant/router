"""Retain complete storage receipts and exact diagnostic payload identities."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
names = ['current-4e709-snapshot-compression.json',
         'current-4e709-snapshot-compression.log',
         'current-ascii-string-duplicate-retirement.json',
         'current-ascii-string-duplicate-retirement.log',
         'current-closed-source-proposal-container-custody.json',
         'current-closed-source-proposal-container-custody.log',
         'current-after-ascii-proposal-container-custody.json']
members = []
for name in names:
    path = base / name
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
containers = []
for name in ['current-unit-unicode-source-proposal.json.xz',
             'current-runtime-import-composition-proposal.json.xz',
             'current-after-ascii-registry-proposal.json.xz']:
    path = base / name
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    containers.append({'path': str(path), 'bytes': path.stat().st_size,
                       'sha256': digest, 'completeDecodedPayloadRetained': True,
                       'originalOuterGzipStreamRetained': False})
record = {'schema': 'complete-current-container-custody-v1',
          'members': members, 'externalContainers': containers,
          'precedingEvidenceBytes': 500469071, 'precedingExcessBytes': 469071,
          'scope': 'Original decoded JSON payloads remain complete. Retired outer gzip streams are not retained.',
          'semanticAuthority': False, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
target = Path('docs/case-studies/issue-784/evidence/current-container-custody.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    original = base64.b64decode(row['base64'], validate=True)
    assert len(original) == row['bytes'] and hashlib.sha256(original).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': target.stat().st_size,
                  'members': len(members), 'completeDecodedPayloadsRetained': True,
                  'originalOuterGzipStreamsRetained': False}))
