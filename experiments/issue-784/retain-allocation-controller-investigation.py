"""Retain complete failed original checks and the abandoned allocation probe."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re

base = Path('ci-logs/issue-784-restart-2')
paths = set()
for prefix in ['current-allocation-original-receiving-',
               'current-allocation-profile-receiving-',
               'current-allocation-controller-profile-',
               'current-allocation-direntry-',
               'current-allocation-preprofile-']:
    paths.update(base.glob(prefix + '*'))
paths.update(Path(name) for name in [__file__,
    'experiments/issue-784/measure-allocation-paths.py',
    'experiments/issue-784/draft-allocation-direntries.py',
    'experiments/issue-784/propose-core-adoption-direntries.py',
    'experiments/issue-784/python-profile/sitecustomize.py',
    'scripts/propose-core-adoption.py',
    'scripts/test/core-adoption-allocation.test.mjs',
    'scripts/test/fixtures/core-adoption-allocation.py'])
audits = []
for path in sorted(paths.copy()):
    if path.name.endswith('.memory.json'):
        receipt = json.loads(path.read_bytes())
        assert not Path('/proc/' + str(receipt['pid'])).exists()
        assert all(not Path('/proc/' + str(pid)).exists()
                   for pid in receipt['stoppedOwnedProcessIds'])
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
    members.append(dict(path=str(path), bytes=len(raw),
        sha256=hashlib.sha256(raw).hexdigest(), base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-original-adoption-allocation-investigation-v1',
    members=members, nodeDeadlineAudits=audits,
    originalReceivingPassed=False, profiledOriginalReceivingPassed=False,
    profilerChangesTiming=True, direntryCandidateInstalled=False,
    direntryComparisonEstablishesAdditionalGain=False,
    firstDirentryControlFailed=True, correctedDirentryControlPassed=True,
    temporaryControlSourceRetainedInsideCompleteMeasurement=True,
    temporaryControlsRestoredBeforeCommit=True,
    fullGatePassed=False, newlyExecutableProductionFunctions=0,
    runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
target = Path('docs/case-studies/issue-784/evidence/current-allocation-controller-investigation.json.gz')
with target.open('xb') as output:
    output.write(packed)
reopened = json.loads(gzip.decompress(target.read_bytes()))
for row in reopened['members']:
    member = base64.b64decode(row['base64'], validate=True)
    assert len(member) == row['bytes'] and hashlib.sha256(member).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), completeMembers=len(members),
    completeReadbackVerified=True, originalReceivingPassed=False,
    direntryCandidateInstalled=False)))
