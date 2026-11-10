"""Retain every entry in four identified, inactive task fixtures before cleanup."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import tarfile

roots = [Path('/tmp/router-owned-unit-matches-data-' + name)
         for name in ['8K99wl', 'P70Fle', 'ravDm3', 'ubzu41']]
target = Path('docs/case-studies/issue-784/evidence/current-unit-fixtures-complete.tar.gz')
receipt = target.with_name('current-unit-fixtures-complete.json.gz')
assert not target.exists() and not receipt.exists()


def identity(path):
    value = path.lstat()
    assert value.st_uid == os.getuid()
    assert stat.S_ISREG(value.st_mode) or stat.S_ISDIR(value.st_mode) or stat.S_ISLNK(value.st_mode)
    return [getattr(value, key) for key in ['st_dev', 'st_ino', 'st_mode', 'st_size',
            'st_mtime_ns', 'st_ctime_ns', 'st_blocks']]


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def inactive():
    def outside(value):
        return all(value != str(root) and not value.startswith(str(root) + '/') for root in roots)
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for path in [process / 'cwd', *(process / 'fd').iterdir()]:
                try:
                    assert outside(os.readlink(path).removesuffix(' (deleted)'))
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                row = line.split(None, 5)
                assert len(row) < 6 or outside(row[5])
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


inactive()
rows = []
for root in roots:
    assert root.is_dir() and not root.is_symlink() and root.resolve() == root
    paths = [root]
    for parent, directories, files in os.walk(root, followlinks=False):
        paths.extend(Path(parent) / name for name in sorted([*directories, *files]))
    for path in paths:
        value = identity(path)
        row = dict(path=str(path), member=str(path.relative_to('/tmp')), identity=value)
        if path.is_symlink():
            row.update(kind='symlink', target=os.readlink(path))
        elif path.is_file():
            assert path.lstat().st_nlink == 1
            row.update(kind='file', bytes=value[3], sha256=digest(path))
        else:
            row['kind'] = 'directory'
        rows.append(row)
assert len(rows) < 1000 and sum(row.get('bytes', 0) for row in rows) < 16_000_000
with target.open('xb') as output:
    with gzip.GzipFile(filename='', fileobj=output, mode='wb', compresslevel=3, mtime=0) as encoder:
        with tarfile.open(fileobj=encoder, mode='w|', dereference=False) as archive:
            for row in rows:
                assert identity(Path(row['path'])) == row['identity']
                archive.add(row['path'], arcname=row['member'], recursive=False)
with tarfile.open(target, mode='r|gz') as archive:
    for row in rows:
        member = archive.next()
        assert member and member.name == row['member']
        if row['kind'] == 'file':
            assert member.isfile() and member.size == row['bytes']
            with archive.extractfile(member) as source:
                assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
        elif row['kind'] == 'symlink':
            assert member.issym() and member.linkname == row['target']
        else:
            assert member.isdir()
    assert archive.next() is None
inactive()
for row in rows:
    path = Path(row['path'])
    assert identity(path) == row['identity']
    if row['kind'] == 'file':
        assert digest(path) == row['sha256']
record = dict(schema='inactive-unit-fixture-whole-custody-v1', archive=str(target),
              archiveBytes=target.stat().st_size, archiveSha256=digest(target), entries=rows,
              wholeMemberReadbackVerified=True, deletedOnlyIdentifiedInactiveTaskFixtures=True,
              originalWholeUnitTestPassed=False, logicalBytesRetired=sum(row.get('bytes', 0) for row in rows),
              allocatedBytesRetired=sum(row['identity'][-1] * 512 for row in rows))
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
for root in roots:
    inactive()
    assert identity(root) == next(row['identity'] for row in rows if row['path'] == str(root))
    shutil.rmtree(root)
assert all(not root.exists() for root in roots)
print(json.dumps({key: record[key] for key in ['archive', 'archiveBytes', 'logicalBytesRetired', 'allocatedBytesRetired']}))
