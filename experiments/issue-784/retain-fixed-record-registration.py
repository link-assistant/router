"""Retain complete registration outputs and both interrupted receiving files."""
import base64
import gzip
import hashlib
import json
import lzma
from pathlib import Path
import re

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
external_names = ['current-fixed-record-registry-proposal.json.xz',
                  'current-fixed-record-registration-refresh.json.xz']
prefixes = ['current-fixed-record-registry-', 'current-fixed-record-registration-',
            'current-fixed-record-isolated-', 'current-fixed-record-preinstall-',
            'current-fixed-record-prereceiving-']
paths = {path for prefix in prefixes for path in base.glob(prefix + '*')}
paths -= {base / name for name in external_names}
paths.update([Path(__file__), Path('experiments/issue-784/review-fixed-record-registry.mjs'),
              Path('experiments/issue-784/refresh-current-isolated-registration.mjs'),
              Path('experiments/issue-784/probe-current-isolated-registry.mjs')])
audits, resources = [], []
for path in sorted(paths.copy()):
    if path.name.endswith('.memory.json'):
        receipt = json.loads(path.read_bytes())
        assert not Path('/proc/' + str(receipt['pid'])).exists()
        assert all(not Path('/proc/' + str(pid)).exists()
                   for pid in receipt['stoppedOwnedProcessIds'])
        resources.append(dict(path=str(path), receipt=receipt))
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            folder = Path(name)
            assert folder.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            terminal = json.loads((folder / 'terminal.json').read_bytes())
            assert terminal['childClosed'] and terminal['groupCleanup']['complete']
            paths.update(row for row in folder.iterdir() if row.is_file())
            audits.append(name)
members = []
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
def verify_rows(value):
    if isinstance(value, list):
        for row in value:
            verify_rows(row)
    elif isinstance(value, dict):
        if {'base64', 'bytes', 'sha256'} <= value.keys():
            raw = base64.b64decode(value['base64'], validate=True)
            assert len(raw) == value['bytes'] and hashlib.sha256(raw).hexdigest() == value['sha256']
        for row in value.values():
            if isinstance(row, (dict, list)):
                verify_rows(row)
external = []
for name in external_names:
    path = base / name
    packed = path.read_bytes()
    raw = lzma.decompress(packed)
    verify_rows(json.loads(raw))
    external.append(dict(originalPath=str(path), retainedPath=str(destination / name),
        bytes=len(packed), sha256=hashlib.sha256(packed).hexdigest(), rawBytes=len(raw),
        rawSha256=hashlib.sha256(raw).hexdigest()))
record = dict(schema='complete-fixed-record-registration-receiving-v1',
    sourceHead='462a202c9f213cd01e3a219a1e3314ca72c21729', members=members,
    externalMembers=external, nodeDeadlineAudits=audits, resourceReceipts=resources,
    inputs=1833, sourceBytes=58006958, portableObjects=470,
    addedInputs=0, changedInputs=1, removedInputs=0,
    originalSelectionDomainUnchanged=True, originalConcreteProfileUnchanged=True,
    completeInstallationPassed=True, initialWrongFilenameLaunchedNoTests=True,
    nodeReceivingCompletedCases=1, bunReceivingCompletedCases=1,
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
target = destination / 'current-fixed-record-registration-receiving.json.gz'
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
verify_rows(json.loads(gzip.decompress(target.read_bytes())))
for row in external:
    source, retained = Path(row['originalPath']), Path(row['retainedPath'])
    assert not retained.exists() and hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
    source.rename(retained)
    assert retained.stat().st_size == row['bytes'] and hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), completeMembers=len(members),
    externalMembers=len(external), completeReadbackVerified=True,
    beforeEvidenceBytes=before, afterEvidenceBytes=before + len(packed))))
