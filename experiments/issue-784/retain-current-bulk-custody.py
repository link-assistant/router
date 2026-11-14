"""Retain complete local checks and proposal bytes with full readback."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

root = Path('ci-logs/issue-784-restart-2')
paths = sorted(set(root.glob('current-bulk-custody-*'))
               | set(root.glob('current-bulk-workflow-*'))
               | set(root.glob('current-bulk-producer-checks*')))
assert 20 <= len(paths) <= 64
members = []
for path in paths:
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-current-bulk-custody-receiving-v1', members=members,
              allCompleteStreamsRetained=True, semanticAuthority=False,
              runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = Path('docs/case-studies/issue-784/evidence/current-bulk-custody-receiving.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes']
    assert hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps(dict(files=len(members), completeBytes=sum(x['bytes'] for x in members),
                      storedBytes=target.stat().st_size, fullReadbackVerified=True)))
