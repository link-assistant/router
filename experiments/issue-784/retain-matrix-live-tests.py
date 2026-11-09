"""Retain and retire only this task's inactive complete deadline files."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import tarfile

root = Path.cwd().resolve()
base = Path('ci-logs/issue-784-restart-2')
attempts = Path('js/node_modules/.node-case-deadlines')
archive = Path('docs/case-studies/issue-784/evidence/current-matrix-live-tests.tar.gz')
receipt = archive.with_name('current-matrix-live-tests.json.gz')
assert not archive.exists() and not receipt.exists()
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'), Path('experiments/issue-784'), attempts]
def allocation():
    return sum(p.stat().st_size for d in roots for p in d.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return (s.st_dev, s.st_ino, s.st_mode, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
paths = sorted(p for p in attempts.rglob('*') if p.is_file())
assert 1 <= len(paths) <= 2048 and not any(p.is_symlink() for p in attempts.rglob('*'))
paths += sorted(base.glob('current-37147a-matrix-trace-*'))
assert all(p.is_file() for p in paths) and sum(p.stat().st_size for p in paths) < 64*1024*1024
rows = [dict(originalPath=str(p), bytes=p.stat().st_size, sha256=digest(p),
             allocatedBytes=p.stat().st_blocks*512, identity=identity(p)) for p in paths]
selected = {str((root / p).resolve()) for p in paths}
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
            assert target not in selected, 'Active original task evidence'
    for p, row in zip(paths, rows):
        assert identity(p) == tuple(row['identity']) and digest(p) == row['sha256']
inactive()
before = allocation()
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
by_path = {r['originalPath']: r for r in rows}
seen = set()
with tarfile.open(archive, mode='r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        with source.extractfile(member) as stream:
            assert member.size == row['bytes'] and hashlib.file_digest(stream,'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
record = dict(schema='complete-matrix-live-test-retention-v1', archive=str(archive),
              archiveBytes=archive.stat().st_size, archiveSha256=digest(archive), members=rows,
              allDecodedOriginalsVerified=True, evidenceBytesBefore=before,
              evidenceCapExceededBefore=before > 500_000_000,
              logicalBytesRetired=sum(r['bytes'] for r in rows),
              allocatedBytesRetired=sum(r['allocatedBytes'] for r in rows),
              runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(raw)
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() - record['logicalBytesRetired'] < 498_000_000
inactive()
for p in paths:
    p.unlink()
for p in sorted(attempts.rglob('*'), key=lambda p:len(p.parts), reverse=True):
    assert p.is_dir()
    p.rmdir()
print(json.dumps({**{k:v for k,v in record.items() if k!='members'},
                  'evidenceBytesAfter':allocation()}))
