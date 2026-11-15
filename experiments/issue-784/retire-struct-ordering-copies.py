"""Retire inactive task copies after complete archive and immutable Git readback."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile

root = Path.cwd()
receipt = Path('docs/case-studies/issue-784/evidence/current-struct-ordering.json.gz')
record = json.loads(gzip.decompress(receipt.read_bytes()))
archive = Path(record['archive'])
commit = subprocess.check_output(['git', 'rev-parse', 'df6e63a2b'], text=True).strip()
blob = subprocess.check_output(['git', 'rev-parse', commit + ':' + str(archive)], text=True).strip()
child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
assert hashlib.file_digest(child.stdout, 'sha256').hexdigest() == record['sha256']
child.stdout.close()
assert child.wait() == 0
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
selected = []
for row in record['members']:
    if 'verificationPath' not in row:
        continue
    path = Path(row['verificationPath']).resolve().relative_to(root)
    if str(path).startswith(('ci-logs/issue-784-restart-2/', 'js/node_modules/.node-case-deadlines/')):
        assert str(path) not in tracked and path.is_file() and not path.is_symlink()
        selected.append(dict(row, physicalPath=str(path), allocatedBytes=path.stat().st_blocks * 512))
assert selected and len({row['physicalPath'] for row in selected}) == len(selected)
expected = {row['path']: row for row in record['members']}
seen = set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        assert member.size == expected[member.name]['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == expected[member.name]['sha256']
        seen.add(member.name)
assert seen == set(expected)


def inactive():
    paths = {str((root / row['physicalPath']).resolve()) for row in selected}
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
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in paths
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
        for line in maps.splitlines():
            fields = line.split(None, 5)
            assert len(fields) < 6 or fields[5].removesuffix(' (deleted)') not in paths
    for row in selected:
        path = Path(row['physicalPath'])
        state = path.lstat()
        assert state.st_nlink == 1 and state.st_uid == os.getuid()
        assert [state.st_dev, state.st_ino, state.st_mode, state.st_size, state.st_mtime_ns, state.st_ctime_ns] == row['identity']
        with path.open('rb') as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']


inactive()
result = dict(schema='committed-complete-struct-ordering-copy-retirement-v1',
              commit=commit, archive=str(archive), archiveSha256=record['sha256'], gitBlob=blob,
              rows=selected, allArchiveMembersReadBack=True, completeGitBlobReadBack=True,
              onlyInactiveUntrackedTaskCopies=True,
              logicalBytesReclaimed=sum(row['bytes'] for row in selected),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in selected),
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(result, separators=(',', ':')).encode()
target = archive.with_name('current-struct-ordering-copy-retirement.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
inactive()
for row in selected:
    Path(row['physicalPath']).unlink()
print(json.dumps(dict(retired=len(selected), receipt=str(target),
                      logicalBytesReclaimed=result['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=result['allocatedBytesReclaimed'])))
