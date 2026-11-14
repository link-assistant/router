"""Retain the complete registry refresh, interrupted installation and receiving."""
import base64
import gzip
import hashlib
import json
import lzma
from pathlib import Path
import re

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
external_names = ['current-companion-registry-proposal.json.xz',
                  'current-companion-registration-refresh.json.xz',
                  'current-companion-interrupted-registration.json.gz']
paths = set(base.glob('current-companion-*')) - {base / name for name in external_names}
paths.update([Path(__file__), Path('experiments/issue-784/review-companion-registry.mjs'),
              Path('experiments/issue-784/restore-interrupted-companion-registration.py'),
              Path('experiments/issue-784/refresh-current-isolated-registration.mjs'),
              Path('experiments/issue-784/probe-current-isolated-registry.mjs')])
audits, resources = [], []
for path in sorted(paths.copy()):
    if path.name.endswith('.memory.json'):
        receipt = json.loads(path.read_bytes())
        assert not Path('/proc/' + str(receipt['pid'])).exists()
        assert all(not Path('/proc/' + str(pid)).exists() for pid in receipt['stoppedOwnedProcessIds'])
        resources.append(dict(path=str(path), receipt=receipt))
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            folder = Path(name)
            assert folder.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.update(row for row in folder.iterdir() if row.is_file())
            audits.append(name)
members = []
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
external = []
for name in external_names:
    path, retained = base / name, destination / name
    packed = path.read_bytes()
    raw = lzma.decompress(packed) if name.endswith('.xz') else gzip.decompress(packed)
    data = json.loads(raw)
    rows = next(data[key] for key in ['files', 'installed', 'members']
                if isinstance(data.get(key), list))
    assert isinstance(rows, list) and rows
    for row in rows:
        decoded = base64.b64decode(row['base64'], validate=True)
        assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    external.append(dict(originalPath=str(path), retainedPath=str(retained), bytes=len(packed),
                         sha256=hashlib.sha256(packed).hexdigest(), rawBytes=len(raw),
                         rawSha256=hashlib.sha256(raw).hexdigest()))
record = dict(schema='complete-companion-registration-refresh-v1',
    sourceHead='ff483c8976c976d8019a6ded9adaf5a3cc179588', members=members,
    externalMembers=external, nodeDeadlineAudits=audits, resourceReceipts=resources,
    inputs=1833, sourceBytes=58006653, portableObjects=470,
    addedInputs=1, changedInputs=6, removedInputs=0,
    originalSelectionDomainUnchanged=True, companionCliOutsideOriginalSelectionDomain=True,
    originalConcreteProfileUnchanged=True, firstInstallationInterrupted=True,
    exactPredecessorsRestoredBeforeRetry=True, completeRetryPassed=True,
    nodeReceivingMemoryGuard=True, bunReceivingMemoryGuard=True,
    currentCompleteReceivingRun=False, fullGatePassed=False,
    newlyExecutableProductionFunctions=0, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'), Path('experiments/issue-784'),
         Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500000000
target = destination / 'current-companion-registration-receiving.json.gz'
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
for row in external:
    source, retained = Path(row['originalPath']), Path(row['retainedPath'])
    assert not retained.exists() and hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
    source.rename(retained)
    assert retained.stat().st_size == row['bytes'] and hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), completeMembers=len(members),
    externalMembers=len(external), completeReadbackVerified=True,
    beforeEvidenceBytes=before, afterEvidenceBytes=before + len(packed))))
