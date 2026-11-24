"""Withdraw only the identified candidate using its complete checked inverse."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
plan = json.loads(gzip.decompress((base / 'current-concrete-common-guard-proposal.json.gz').read_bytes()))
target = Path(plan['path'])
assert target.read_bytes() == plan['after'].encode()
assert plan['inverse'] == plan['before']
assert hashlib.sha256(plan['before'].encode()).hexdigest() == plan['beforeSha256']
assert hashlib.sha256(plan['after'].encode()).hexdigest() == plan['afterSha256']
paths = [
    Path('tools/translation/prepare-concrete-common-guard.mjs'),
    Path('tools/translation/test/concrete-common-guard.test.mjs'),
    Path('tools/translation/source-profiles/concrete-common-guard/original.mjs.gz'),
]
rows = []
for path in paths:
    state = path.lstat()
    assert path.is_file() and not path.is_symlink() and state.st_nlink == 1
    raw = path.read_bytes()
    rows.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                     base64=base64.b64encode(raw).decode()))
packet = base / 'current-concrete-common-withdrawn-sources.json.gz'
raw = json.dumps(dict(schema='withdrawn-concrete-common-source-v1', rows=rows,
                     candidateRejectedForUnqualifiedPerformance=True)).encode()
with packet.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(packet.read_bytes()) == raw
for row in json.loads(gzip.decompress(packet.read_bytes()))['rows']:
    original = base64.b64decode(row['base64'], validate=True)
    assert Path(row['path']).read_bytes() == original
    assert hashlib.sha256(original).hexdigest() == row['sha256']
target.write_bytes(plan['inverse'].encode())
assert target.read_bytes() == plan['before'].encode()
destinations = [Path('experiments/issue-784/concrete-common-guard-source.mjs'),
                None, Path('experiments/issue-784/concrete-common-guard-original.mjs.gz')]
for path, destination in zip(paths, destinations):
    if destination is None:
        path.unlink()  # Complete rejected test source retained in the verified packet.
    else:
        assert not destination.exists()
        path.rename(destination)
paths[-1].parent.rmdir()
receipt = dict(schema='concrete-common-candidate-withdrawal-v1', target=str(target),
               restoredSha256=hashlib.sha256(target.read_bytes()).hexdigest(),
               completeInverseReadbackVerified=True, packet=str(packet),
               packetDecodedSha256=hashlib.sha256(raw).hexdigest(),
               movedToExperiments=[str(path) for path in destinations if path],
               performanceQualified=False, ciChecksFixed=False)
with (base / 'current-concrete-common-withdrawal.json').open('x') as output:
    json.dump(receipt, output, indent=2)
print(json.dumps(receipt))
