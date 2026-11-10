"""Retire only complete inactive task copies after immutable Git blob readback."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = [Path(os.fsdecode(name)) for name in
         (base / 'project-source-origin-custody-paths.nul').read_bytes().split(b'\0') if name]
receipt = Path('docs/case-studies/issue-784/evidence/project-source-origin-copy-retirement.json.gz')
assert len(paths) == len(set(paths)) == 52 and not receipt.exists()
assert subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip() == 'issue-784-1f6838f56841'
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()


def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return [s.st_dev, s.st_ino, s.st_mode, s.st_size, s.st_mtime_ns, s.st_ctime_ns]


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def inactive(rows):
    selected = {str(Path(row['path']).resolve()) for row in rows}
    inodes = {(row['identity'][0], row['identity'][1]) for row in rows}
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
                value = descriptor.stat()
                assert (value.st_dev, value.st_ino) not in inodes
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except OSError:
                continue
        for line in maps.splitlines():
            parts = line.split(None, 5)
            assert len(parts) < 6 or parts[5].removesuffix(' (deleted)') not in selected


rows = []
for path in paths:
    assert str(path).startswith(('ci-logs/issue-784-restart-2/project-source-origin-',
        'ci-logs/issue-784-restart-2/production-derive-cpu',
        'js/node_modules/.node-case-deadlines/complete-dtaXYQ/',
        'js/node_modules/.node-case-deadlines/complete-bCIUnb/',
        'js/node_modules/.node-case-deadlines/complete-f5MoU5/'))
    before, expected = identity(path), digest(path)
    blob = subprocess.check_output(['git', 'rev-parse', commit + ':' + str(path)], text=True).strip()
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == expected
    assert child.wait() == 0 and identity(path) == before
    rows.append(dict(path=str(path), bytes=path.stat().st_size,
        allocatedBytes=path.stat().st_blocks * 512, sha256=expected,
        identity=before, gitBlob=blob, completeImmutableBlobReadbackVerified=True,
        permanentUrl='https://github.com/link-assistant/router/blob/' + commit + '/' + str(path) + '?raw=true'))
inactive(rows)
record = dict(schema='complete-project-source-origin-copy-retirement-v1',
    retainedSourceCommit=commit, sourceCommitPublishedAtRetirement=False, rows=rows,
    completeOriginalsRetainedInGitHistory=True,
    logicalBytesReclaimed=sum(row['bytes'] for row in rows),
    allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
    onlyInactiveTaskCopies=True, sourceOrDeadlineChanges=False,
    semanticAuthority=False, fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive(rows)
for row in rows:
    path = Path(row['path'])
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    path.unlink()
assert all(not path.exists() for path in paths)
print(json.dumps({key: record[key] for key in ['retainedSourceCommit',
    'logicalBytesReclaimed', 'allocatedBytesReclaimed', 'completeOriginalsRetainedInGitHistory']}))
