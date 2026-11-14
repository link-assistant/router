"""Keep the complete actual canonical custody compiler snapshot refresh."""
import base64
import gzip
import hashlib
import json
import lzma
from pathlib import Path
import re

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
paths = [Path(__file__), Path('experiments/issue-784/review-current-bulk-registry.mjs'),
         base / 'current-bulk-registry-review.log',
         base / 'current-bulk-registry-review.json.gz',
         base / 'current-bulk-registration-closed-git-pages.json',
         base / 'current-bulk-registration-closed-git-pages.log']
for label in ['current-bulk-registry-proposal', 'current-bulk-registration-refresh',
              'current-bulk-registry-receiving-node', 'current-bulk-registry-receiving-node-corrected', 'current-bulk-registry-receiving-bun']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        paths.append(base / (label + suffix))
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    assert all(not Path('/proc/' + str(pid)).exists() for pid in receipt['stoppedOwnedProcessIds'])
    if not 'receiving' in label:
        assert receipt['exitCode'] == 0 and not receipt['stopped']
    else:
        assert receipt['exitCode'] != 0
        if label != 'current-bulk-registry-receiving-node':
            assert receipt['stopped']
audits = []
for path in list(paths):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            folder = Path(name)
            assert folder.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(path for path in folder.iterdir() if path.is_file())
            audits.append(name)
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
external = []
for name in ['current-bulk-registry-proposal.json.xz',
             'current-bulk-registration-refresh.json.xz']:
    path, retained = base / name, destination / name
    packed = path.read_bytes()
    raw = lzma.decompress(packed)
    data = json.loads(raw)
    for row in data['files'] if isinstance(data.get('files'), list) else data['installed']:
        decoded = base64.b64decode(row['base64'], validate=True)
        assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    external.append(dict(originalPath=str(path), retainedPath=str(retained),
                         bytes=len(packed), sha256=hashlib.sha256(packed).hexdigest(),
                         rawBytes=len(raw), rawSha256=hashlib.sha256(raw).hexdigest()))
record = dict(schema='complete-bulk-registration-refresh-v1',
              sourceHead='11aca637da6ba73c021ddc60e81badc7cb26e4a7',
              members=members, externalMembers=external, nodeDeadlineAudits=audits,
              inputs=1832, sourceBytes=57980131, portableObjects=470,
              addedInputs=6, changedInputs=5, removedInputs=0,
              originalConcreteProfileUnchanged=True, currentCompleteReceivingRun=False,
              initialNodeSelectionTypo=True, nodeReceivingMemoryGuard=True, bunReceivingMemoryGuard=True,
              fullGatePassed=False, newlyExecutableProductionFunctions=0,
              runtimeParity=False, rustExecuted=False)
target = destination / 'current-bulk-registration.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
for row in external:
    source, retained = Path(row['originalPath']), Path(row['retainedPath'])
    assert not retained.exists() and hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
    source.rename(retained)
    assert retained.stat().st_size == row['bytes'] and hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     externalBytes=sum(row['bytes'] for row in external), wholeReadbackVerified=True)))
