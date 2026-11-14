"""Keep the complete reviewed residual/unwrap compiler snapshot refresh."""
import base64
import gzip
import hashlib
import json
import lzma
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
members, external = [], []
for label in ['current-residual-registry-proposal', 'current-residual-registration-refresh']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = base / (label + suffix)
        raw = path.read_bytes()
        members.append(dict(path=str(path), bytes=len(raw),
                            sha256=hashlib.sha256(raw).hexdigest(),
                            base64=base64.b64encode(raw).decode()))
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
for name in ['current-residual-registry-proposal.json.xz',
             'current-residual-registration-refresh.json.xz']:
    path, retained = base / name, destination / name
    assert path.is_file() and not retained.exists()
    packed = path.read_bytes()
    raw = lzma.decompress(packed)
    data = json.loads(raw)
    for row in data['files'] if isinstance(data.get('files'), list) else data['installed']:
        decoded = base64.b64decode(row['base64'], validate=True)
        assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    external.append(dict(originalPath=str(path), retainedPath=str(retained),
                         bytes=len(packed), sha256=hashlib.sha256(packed).hexdigest(),
                         rawBytes=len(raw), rawSha256=hashlib.sha256(raw).hexdigest()))
for path in [Path(__file__), Path('experiments/issue-784/review-current-residual-registry.mjs'),
             base / 'current-residual-registry-review.log',
             base / 'current-residual-registry-review.json.gz']:
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-residual-registration-refresh-v1',
              sourceHead='6de907547b18993b252aa91542f5c75bc7a420dd',
              members=members, externalMembers=external,
              inputs=1824, sourceBytes=57923560, portableObjects=468,
              addedInputs=0, changedInputs=2, removedInputs=0,
              originalConcreteProfileUnchanged=True,
              currentCompleteReceivingRun=False, fullGatePassed=False,
              newlyExecutableProductionFunctions=0, runtimeParity=False, rustExecuted=False)
target = destination / 'current-residual-registration.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
for row in external:
    source, retained = Path(row['originalPath']), Path(row['retainedPath'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
    source.rename(retained)
    assert retained.stat().st_size == row['bytes'] and hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     externalBytes=sum(row['bytes'] for row in external),
                     wholeReadbackVerified=True)))
