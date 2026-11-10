"""Read back complete terminal task audits before retiring exact inactive copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import tarfile

root = Path.cwd()
archive = Path('docs/case-studies/issue-784/evidence/closed-node-audits-20261110.tar.gz')
receipt = archive.with_name('closed-node-audits-20261110.json.gz')
assert not archive.exists() and not receipt.exists()
folders = sorted(p for p in Path('js/node_modules/.node-case-deadlines').glob('complete-*')
                 if p.name != 'complete-MYF8Op')
assert 1 <= len(folders) <= 64
for folder in folders:
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
paths = sorted(p for folder in folders for p in folder.iterdir() if p.is_file())
assert sum(p.stat().st_size for p in paths) <= 32 * 1024 * 1024


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns


rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p), identity=identity(p))
        for p in paths]
selected = {str((root / p).resolve()) for p in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
    for p, row in zip(paths, rows):
        assert identity(p) == row['identity'] and digest(p) == row['sha256']


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, value):
        assert self.bytes + len(value) <= 4 * 1024 * 1024
        size = self.stream.write(value)
        self.bytes += size
        return size

    def flush(self):
        self.stream.flush()


inactive()
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=BoundedOutput(target), mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
by_name, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        row = by_name[member.name]
        assert member.isfile() and member.name not in seen and member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_name)
record = dict(schema='complete-terminal-audit-retirement-v1', archive=str(archive),
              bytes=archive.stat().st_size, sha256=digest(archive), members=rows,
              attempts=len(folders), failuresRetained=True, fullGatePassed=False)
with receipt.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(json.dumps(record).encode())
assert json.loads(gzip.decompress(receipt.read_bytes()))['sha256'] == record['sha256']
inactive()
for path in paths:
    path.unlink()
for folder in folders:
    folder.rmdir()
print(json.dumps(dict(archive=str(archive), bytes=record['bytes'], sha256=record['sha256'],
                      attempts=len(folders), members=len(rows),
                      retiredRawBytes=sum(row['bytes'] for row in rows))))
