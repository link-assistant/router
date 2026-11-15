"""Keep the complete companion proposal, sources and whole receiving attempts."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
proposal = base / 'current-bulk-companions-proposal.json.gz'
packed = proposal.read_bytes()
assert hashlib.sha256(packed).hexdigest() == '5e904a45b9ed3681a04aba96046bc6af40822a28c278a3670ac7d30229fe0ac1'
complete = gzip.decompress(packed)
assert len(complete) == 20683813 and len(packed) == 2637914
plan = json.loads(complete)
for row in plan['files']:
    assert Path(row['path']).read_text() == row['after']
paths = set(base.glob('current-bulk-companions-*')) - {proposal}
paths.update([Path(__file__), Path('experiments/issue-784/prepare-bulk-custody-companions.mjs'),
    Path('experiments/issue-784/retire-published-f868-artifacts.py'),
    Path('tools/translation/prepare-bulk-draft-custody.mjs'),
    Path('tools/translation/test/bulk-draft-custody.test.mjs'),
    Path('scripts/check-js-first-workflows.mjs'),
    Path('scripts/prepare-matrix-draft-workflow.mjs'),
    Path('scripts/test/check-js-first-workflows.test.mjs'),
    base / 'current-f868-artifact-retirement-plan.log',
    base / 'current-f868-artifact-retirement.log',
    base / 'current-published-f868-artifact-tree.json.gz'])
paths.update(Path(row['path']) for row in plan['files'])
audits, receipts = [], []
for path in sorted(paths.copy()):
    if path.name.endswith('.memory.json'):
        receipt = json.loads(path.read_bytes())
        assert not Path('/proc/' + str(receipt['pid'])).exists()
        assert all(not Path('/proc/' + str(pid)).exists() for pid in receipt['stoppedOwnedProcessIds'])
        receipts.append(dict(path=str(path), receipt=receipt))
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
retained_proposal = destination / proposal.name
record = dict(schema='complete-bulk-companion-receiving-v1',
    sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    workingTreeContainsCompleteSourceBatch=True, members=members, resourceReceipts=receipts,
    nodeDeadlineAudits=audits, completeProposal=dict(path=str(retained_proposal),
        storedBytes=len(packed), sha256=hashlib.sha256(packed).hexdigest(),
        decodedBytes=len(complete), decodedSha256=hashlib.sha256(complete).hexdigest()),
    nodeCustodyPassed=True, nodeNativeSourceHistoryPassed=True, nodeWorkflowControlsPassed=True,
    bunCustodyAndNativeSourceHistoryInterrupted=True, semanticAuthority=False,
    fullGatePassed=False, runtimeParity=False, rustExecuted=False,
    newlyExecutableProductionFunctions=0)
raw = json.dumps(record, separators=(',', ':')).encode()
target = destination / 'current-bulk-companions-receiving.json.gz'
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'), Path('experiments/issue-784'),
         Path('js/node_modules/.node-case-deadlines')]
before = sum(p.stat().st_size for root in roots for p in root.rglob('*')
             if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
retained = gzip.compress(raw, mtime=0)
assert before + len(retained) < 500000000
with target.open('xb') as output:
    output.write(retained)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
assert not retained_proposal.exists() and proposal.read_bytes() == packed
proposal.rename(retained_proposal)
assert retained_proposal.read_bytes() == packed
print(json.dumps(dict(path=str(target), files=len(members), bytes=len(retained),
    completeProposal=str(retained_proposal), completeReadbackVerified=True,
    beforeEvidenceBytes=before, afterEvidenceBytes=before + len(retained))))
