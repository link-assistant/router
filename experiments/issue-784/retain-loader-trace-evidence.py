"""Retain complete inactive source-repair evidence, then retire verified copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import tarfile

label, = sys.argv[1:]
groups = {
    'current-loader-repair': ['current-loader*'],
    'current-native-trace-repair': ['current-trace*'],
    'current-withdrawn-concrete-guard': ['current-concrete*'],
    'current-terminal-matrix-ci-logs': ['current-52e2c04*'],
    'current-terminal-matrix-ci-receipts': ['current-matrix*', 'current-feedback*'],
    'current-registered-loader-deadlines': [],
    'current-registered-loader-trace': ['current-loader-trace*', 'registered-loader-trace*',
                                       'loader-trace-checkpoint*', 'loader-trace-registration*'],
}
assert label in groups
base = Path('ci-logs/issue-784-restart-2')
attempts = Path('js/node_modules/.node-case-deadlines')
paths = sorted({p for pattern in groups[label] for p in base.glob(pattern) if p.is_file()})
if label in ['current-withdrawn-concrete-guard', 'current-registered-loader-deadlines']:
    paths += sorted(p for p in attempts.rglob('*') if p.is_file())
assert paths and not any(p.is_symlink() for p in paths)
archive = Path('docs/case-studies/issue-784/evidence') / (label + '.tar.gz')
receipt = archive.with_name(label + '.json.gz')
assert not archive.exists() and not receipt.exists()
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), attempts]


def allocation():
    return sum(p.stat().st_size for root in roots for p in root.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return value.st_dev, value.st_ino, value.st_mode, value.st_size, value.st_mtime_ns, value.st_ctime_ns


rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p),
             identity=identity(p), allocatedBytes=p.stat().st_blocks * 512) for p in paths]
selected = {str(p.resolve()) for p in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        links = [process / 'cwd', process / 'exe']
        try:
            links.extend((process / 'fd').iterdir())
        except OSError:
            pass
        for link in links:
            try:
                target = os.readlink(link).removesuffix(' (deleted)')
            except OSError:
                continue
            assert target not in selected, 'Active original evidence'
    for path, row in zip(paths, rows):
        assert identity(path) == row['identity'] and digest(path) == row['sha256']


inactive()
before = allocation()
logical = sum(row['bytes'] for row in rows)
assert before + logical + 1048576 < 500000000
with archive.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as target:
            for path in paths:
                target.add(path, arcname=str(path), recursive=False)
seen = set()
by_path = {row['path']: row for row in rows}
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        with source.extractfile(member) as stream:
            assert member.size == row['bytes']
            assert hashlib.file_digest(stream, 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
record = dict(schema='complete-loader-trace-repair-retention-v1', archive=str(archive),
              archiveBytes=archive.stat().st_size, archiveSha256=digest(archive),
              members=rows, allDecodedOriginalsVerified=True, evidenceBytesBefore=before,
              logicalBytesRetired=logical, allocatedBytesRetired=sum(row['allocatedBytes'] for row in rows),
              runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() < 500000000
inactive()
for path in paths:
    path.unlink()
if label in ['current-withdrawn-concrete-guard', 'current-registered-loader-deadlines']:
    for path in sorted(attempts.rglob('*'), key=lambda p: len(p.parts), reverse=True):
        assert path.is_dir()
        path.rmdir()
print(json.dumps({key: value for key, value in record.items() if key != 'members'}
                 | {'members': len(rows), 'evidenceBytesAfter': allocation()}))
