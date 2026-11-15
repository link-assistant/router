"""Losslessly consolidate inactive task CI observations under the fixed allocation."""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs')
target = Path('docs/case-studies/issue-784/evidence/closed-raw-ci-observations.tar.gz')
receipt = target.with_name('closed-raw-ci-observations.json.gz')
assert not target.exists() and not receipt.exists()
assert not subprocess.check_output(['git', 'ls-files', '--', str(base)])


def active_paths():
    active = set()
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    active.add(os.readlink(fd).removesuffix(' (deleted)'))
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                if len(fields) == 6:
                    active.add(fields[5])
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    return active


def identity(info):
    return [info.st_dev, info.st_ino, info.st_mode, info.st_uid, info.st_nlink,
            info.st_size, info.st_mtime_ns, info.st_ctime_ns]


active = active_paths()
rows, bodies = [], {}
for path in sorted(base.rglob('*')):
    if not path.is_file() or path.suffix not in ['.json', '.log', '.tap', '.stderr', '.txt', '.patch', '.diff']:
        continue
    info = path.lstat()
    if (str(root / path) in active or not stat.S_ISREG(info.st_mode)
            or info.st_uid != os.getuid() or info.st_nlink != 1):
        continue
    assert path.resolve() == root / path and info.st_size <= 1_048_576
    raw = path.read_bytes()
    assert len(raw) == info.st_size and identity(path.lstat()) == identity(info)
    bodies[str(path)] = raw
    rows.append({'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                 'identity': identity(info), 'allocatedBytes': info.st_blocks * 512})
assert 100 <= len(rows) <= 2000 and sum(row['bytes'] for row in rows) < 4_194_304
buffer = io.BytesIO()
with tarfile.open(fileobj=buffer, mode='w', format=tarfile.PAX_FORMAT) as archive:
    for row in rows:
        info = tarfile.TarInfo(row['path'])
        info.size = row['bytes']
        archive.addfile(info, io.BytesIO(bodies[row['path']]))
packed = gzip.compress(buffer.getvalue(), mtime=0)
with tarfile.open(fileobj=io.BytesIO(packed), mode='r:gz') as archive:
    assert archive.getnames() == [row['path'] for row in rows]
    for row in rows:
        with archive.extractfile(row['path']) as stream:
            assert stream.read() == bodies[row['path']]
record = {'schema': 'complete-closed-raw-ci-observations-v1', 'rows': rows,
          'archive': str(target), 'archiveBytes': len(packed),
          'archiveSha256': hashlib.sha256(packed).hexdigest(),
          'completeOriginalBytesReopenedAndVerified': True,
          'scope': 'Inactive untracked task CI observations only. All complete originals remain recoverable by their exact TAR member names; no source, build cache, active or foreign file is removed.'}
encoded = gzip.compress(json.dumps(record, separators=(',', ':')).encode() + b'\n', mtime=0)
size = 0
for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(name):
        if Path(parent) == Path('experiments/issue-784'):
            children[:] = [child for child in children if child != 'toolchain']
        size += sum((Path(parent) / path).stat().st_size for path in files
                    if not (Path(parent) / path).is_symlink())
assert size + len(packed) + len(encoded) < 500_000_000, (size, len(packed), len(encoded))
for path, content in [(target, packed), (receipt, encoded)]:
    with path.open('xb') as output:
        output.write(content)
    assert path.read_bytes() == content
with tarfile.open(target, 'r:gz') as archive:
    for row in rows:
        with archive.extractfile(row['path']) as stream:
            assert stream.read() == bodies[row['path']]
assert json.loads(gzip.decompress(receipt.read_bytes())) == record
active = active_paths()
assert all(str(root / row['path']) not in active for row in rows)
for row in rows:
    path = Path(row['path'])
    assert identity(path.lstat()) == row['identity'] and path.read_bytes() == bodies[row['path']]
for row in rows:
    Path(row['path']).unlink()
print(json.dumps({'files': len(rows), 'rawBytes': sum(row['bytes'] for row in rows),
                  'archiveBytes': len(packed), 'receiptBytes': len(encoded),
                  'logicalBytesReclaimed': sum(row['bytes'] for row in rows) - len(packed) - len(encoded),
                  'allocatedRawBytesReclaimed': sum(row['allocatedBytes'] for row in rows),
                  'censusAfterBytes': size + len(packed) + len(encoded) - sum(row['bytes'] for row in rows)}))
