"""Qualify the complete packet whose first reviewer mishandled absolute names.

No archive is rewritten or extracted. Verify every complete member against its
still-present source (or immutable Git predecessor), then issue the receipt.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

root = Path.cwd()
head = 'f93b01795a935317942adfe7d329f636dcd1848b'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == head
archive = Path('docs/case-studies/issue-784/evidence/current-struct-ordering.tar.gz')
receipt = archive.with_name('current-struct-ordering.json.gz')
assert not receipt.exists()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    return [info.st_dev, info.st_ino, info.st_mode, info.st_size,
            info.st_mtime_ns, info.st_ctime_ns]


assert digest(archive) == 'c856727f5e62a59995649a9cef42d2225758a14e4ffa845344405dccf1f9ccd0'
archive_identity = identity(archive)
rows = []
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and '..' not in Path(member.name).parts
        actual = hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest()
        if member.name.startswith('baseline/' + head + '/'):
            path = member.name.removeprefix('baseline/' + head + '/')
            raw = subprocess.check_output(['git', 'show', head + ':' + path])
            assert len(raw) == member.size and hashlib.sha256(raw).hexdigest() == actual
            rows.append(dict(path=member.name, bytes=member.size, sha256=actual,
                             immutableGitPredecessor=head))
            continue
        # tarfile strips a leading slash when writing an absolute audit path.
        path = Path('/' + member.name) if member.name.startswith(str(root).lstrip('/') + '/') else Path(member.name)
        if str(path) == 'experiments/issue-784/retain-struct-ordering-evidence.py':
            path = Path('experiments/issue-784/retain-struct-ordering-evidence-member-failure.py')
        assert path.resolve().is_relative_to(root)
        state = identity(path)
        assert path.stat().st_size == member.size and digest(path) == actual
        rows.append(dict(path=member.name, verificationPath=str(path), bytes=member.size,
                         sha256=actual, identity=state))
assert len(rows) < 512 and len({row['path'] for row in rows}) == len(rows)
absolute = {str(Path(row['verificationPath']).resolve()) for row in rows if 'verificationPath' in row}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        descriptors = list((process / 'fd').iterdir())
        maps = (process / 'maps').read_text(errors='replace')
    except OSError:
        continue
    for descriptor in descriptors:
        try:
            assert os.readlink(descriptor).removesuffix(' (deleted)') not in absolute
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    for line in maps.splitlines():
        fields = line.split(None, 5)
        assert len(fields) < 6 or fields[5].removesuffix(' (deleted)') not in absolute
for row in rows:
    if 'verificationPath' in row:
        path = Path(row['verificationPath'])
        assert identity(path) == row['identity'] and digest(path) == row['sha256']
assert identity(archive) == archive_identity
record = dict(schema='complete-struct-ordering-draft-evidence-v1', recordingHead=head,
              draftSourcesDifferFromRecordingHead=True, archive=str(archive),
              bytes=archive.stat().st_size, sha256=digest(archive), members=rows,
              allMembersReadBack=True, originalReviewerFailed=True,
              originalReviewerFailure='absolute audit paths lost their leading slash in tar member names',
              correctionDoesNotRewriteArchive=True,
              baselineNewFileCases=dict(passed=1, failed=6),
              finalWholeNodeCases=dict(passed=15, failed=0, deadlineAuditPassed=True),
              isolatedBunCases=dict(originalPassed=8, newPassed=7, failed=0),
              combinedBunResourceGuardStopped=True, originalCsvNamespaceProbesFailed=True,
              actualSemanticLinkOrderingNamespaceClosed=True, wholeCsvReceivingQualified=False,
              productionExecutableGain=0, fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(archive), bytes=record['bytes'], sha256=record['sha256'],
                      members=len(rows), completeMemberReadbackVerified=True)))
