"""Retain complete generation/gate resource failures without duplicate archives."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
folder = Path('docs/case-studies/issue-784/evidence/current-production-resource-files')
folder.mkdir(exist_ok=True)
assert not any(folder.iterdir())
members = []
temporary_audit_reports = []
source = Path('experiments/issue-784/run-observed-check.py')


def row(path, raw, version='current'):
    return dict(path=str(path), version=version, bytes=len(raw),
                sha256=hashlib.sha256(raw).hexdigest())


before = subprocess.check_output(['git', 'show', '000b0547e:' + str(source)])
members.append(dict(row(source, before, '000b0547e'), base64=base64.b64encode(before).decode()))
paths = [source, Path(__file__)]
for pattern in ['current-standard-generation*', 'current-standard-generate-*',
                'current-standard-full-gate*', 'current-canonical-page-advice*']:
    paths.extend(path for path in base.glob(pattern) if path.is_file())
for path in list(paths):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name)
            if directory.parent.resolve() != Path('js/node_modules/.node-case-deadlines').resolve():
                assert str(directory).startswith('/tmp/router-gate-concurrency-')
                assert not directory.exists()
                temporary_audit_reports.append(dict(path=str(directory),
                    available=False, scope='gate control test temporary fixture; complete gate stream retained'))
                continue
            paths.extend(sorted(directory.iterdir()))
moved = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    member = row(path, raw)
    if path.suffix == '.gz':
        # This is an inactive task-owned adviser receipt. Verify its entire
        # JSON before transferring the exact archive, keeping original paths
        # in the custody manifest and all command receipts unmodified.
        decoded = gzip.decompress(raw)
        json.loads(decoded)
        target = folder / path.name
        target.write_bytes(raw)
        assert target.read_bytes() == raw
        member.update(retainedPath=str(target), decodedBytes=len(decoded),
                      decodedSha256=hashlib.sha256(decoded).hexdigest())
        moved.append((path, target, len(raw)))
    else:
        member['base64'] = base64.b64encode(raw).decode()
    members.append(member)
record = dict(schema='complete-production-and-gate-resource-evidence-v1', members=members,
              temporaryAuditReports=temporary_audit_reports,
              producerHead='8f42050791fb225aae2a0870f9e6bedccdd448a5',
              canonical320Head='000b0547e6ccb7059028e0b05de1c335c6f0c6c7',
              allProductionPassed=False, fullGatePassed=False,
              fullGateStages={'lint':'passed','node-tests':'passed (259)',
                              'bun-tests':'passed (259)','typescript':'interrupted',
                              'parity':'unrun','translation':'unrun','reverse-translation':'unrun'},
              guardChanged=False, originalDeadlinesChanged=False,
              runtimeParity=False, rustExecuted=False)
target = folder.parent / 'current-production-resource-evidence.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = (Path(member['retainedPath']).read_bytes() if 'retainedPath' in member
           else base64.b64decode(member['base64'], validate=True))
    assert len(raw) == member['bytes'] and hashlib.sha256(raw).hexdigest() == member['sha256']
    if 'decodedSha256' in member:
        decoded = gzip.decompress(raw)
        assert len(decoded) == member['decodedBytes']
        assert hashlib.sha256(decoded).hexdigest() == member['decodedSha256']
        json.loads(decoded)
for original, retained, size in moved:
    assert original.read_bytes() == retained.read_bytes()
    original.unlink()
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True,
                     inactiveArchivesTransferred=len(moved),
                     duplicateLogicalBytesAvoided=sum(size for _, _, size in moved))))
