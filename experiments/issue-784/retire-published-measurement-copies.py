"""Preserve immutable published custody before retiring three inactive copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

published = '93995ee40be4b570becbe0b788dba58f5bd0ea6f'
base = Path('ci-logs/issue-784-restart-2')
selected = [
    ('consumer', 'current-operation-measurement-consumer-source.json.gz', 16114037),
    ('default', 'current-operation-measurement-default-source.json.gz', 12284860),
    ('default-v2', 'current-operation-measurement-default-source-v2.json.gz', 12285010),
]
assert subprocess.check_output(['git', 'ls-remote', 'origin',
    'refs/heads/issue-784-1f6838f56841'], text=True).split()[0] == published


def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_nlink == 1 and s.st_uid == os.getuid()
    return [s.st_dev, s.st_ino, s.st_mode, s.st_nlink, s.st_size,
            s.st_mtime_ns, s.st_ctime_ns]


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def inactive(paths):
    selected = {str(p.resolve()) for p in paths}
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
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except OSError:
                pass
        for line in maps.splitlines():
            parts = line.split(None, 5)
            assert len(parts) < 6 or parts[5].removesuffix(' (deleted)') not in selected


rows = []
for label, name, size in selected:
    path = Path('docs/case-studies/issue-784/evidence') / name
    before = identity(path)
    assert path.stat().st_size == size
    metadata = json.loads((base / ('tar-checksum-storage-' + label + '-metadata.json')).read_bytes())
    assert metadata['path'] == str(path) and metadata['size'] == size and metadata['type'] == 'file'
    blob = subprocess.check_output(['git', 'rev-parse', published + ':' + str(path)], text=True).strip()
    assert metadata['sha'] == blob
    expected = digest(path)
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == expected
    assert child.wait() == 0 and identity(path) == before
    rows.append(dict(path=str(path), bytes=size, sha256=expected, identity=before,
        allocatedBytes=path.stat().st_blocks * 512, metadata=metadata,
        gitBlob=blob, completePublishedStreamVerified=True,
        permanentUrl='https://github.com/link-assistant/router/blob/' + published + '/' + str(path) + '?raw=true'))
paths = [Path(row['path']) for row in rows]
inactive(paths)
receipt = Path('docs/case-studies/issue-784/evidence/published-measurement-copy-retirement.json.gz')
record = dict(schema='published-complete-measurement-copy-retirement-v1',
    publishedCommit=published, rows=rows,
    logicalBytesReclaimed=sum(row['bytes'] for row in rows),
    allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
    completeOriginalsRetainedInPublishedGit=True, onlyInactiveTaskCopies=True,
    semanticAuthority=False, runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive(paths)
for row, path in zip(rows, paths):
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    path.unlink()
assert all(not path.exists() for path in paths)
print(json.dumps(dict(retired=len(rows), receipt=str(receipt),
    logicalBytesReclaimed=record['logicalBytesReclaimed'],
    allocatedBytesReclaimed=record['allocatedBytesReclaimed'])))
