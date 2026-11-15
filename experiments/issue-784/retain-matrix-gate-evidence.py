"""Losslessly retain inactive task gate evidence and compact one JSON receipt."""
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path
import stat
import sys
import tarfile

base = Path('ci-logs/issue-784-restart-2')
attempts = Path('js/node_modules/.node-case-deadlines')
archive = Path('docs/case-studies/issue-784/evidence/current-matrix-live-gate.tar.xz')
receipt = archive.with_name('current-matrix-live-gate-retention.json.gz')
old_json = base / 'current-37147a-deadline-inspection-4.json.gz'
new_json = old_json.with_suffix('.xz')
resume = sys.argv[1:] == ['--finish-verified']
assert not sys.argv[1:] or resume
assert all(p.exists() == resume for p in [archive, receipt, new_json])
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), attempts]


def allocation():
    return sum(p.stat().st_size for d in roots for p in d.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return (s.st_dev, s.st_ino, s.st_mode, s.st_size, s.st_mtime_ns, s.st_ctime_ns)


paths = sorted(p for p in attempts.rglob('*') if p.is_file())
paths += sorted(base.glob('current-matrix-live-full-gate*'))
paths += [base / 'current-matrix-live-after-gate-pages.json.gz']
assert 1 <= len(paths) <= 2048 and sum(p.stat().st_size for p in paths) < 64*1024*1024
assert not any(p.is_symlink() for p in attempts.rglob('*'))
rows = [dict(originalPath=str(p), bytes=p.stat().st_size, sha256=digest(p),
             allocatedBytes=p.stat().st_blocks*512, identity=identity(p)) for p in paths]
old_identity = identity(old_json)
selected = {str(p.resolve()) for p in [*paths, old_json]}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            links = list((process / 'fd').iterdir())
        except OSError:
            continue
        for link in links:
            try:
                target = os.readlink(link).removesuffix(' (deleted)')
            except OSError:
                continue
            assert target not in selected, 'Active original task evidence'
    for p, row in zip(paths, rows):
        assert identity(p) == tuple(row['identity']) and digest(p) == row['sha256']
    assert identity(old_json) == old_identity


inactive()
if resume:
    record = json.loads(gzip.decompress(receipt.read_bytes()))
    assert record['members'] == json.loads(json.dumps(rows))
    assert digest(archive) == record['archiveSha256']
    by_path, seen = {r['originalPath']: r for r in rows}, set()
    with tarfile.open(archive, mode='r|xz') as source:
        for member in source:
            assert member.isfile() and member.name in by_path and member.name not in seen
            row = by_path[member.name]
            with source.extractfile(member) as stream:
                assert member.size == row['bytes']
                assert hashlib.file_digest(stream, 'sha256').hexdigest() == row['sha256']
            seen.add(member.name)
    assert seen == set(by_path)
    transcode = record['inspectionTranscode']
    assert digest(old_json) == transcode['originalSha256']
    assert digest(new_json) == transcode['sha256']
    with gzip.open(old_json, 'rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == transcode['decodedSha256']
    with lzma.open(new_json, 'rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == transcode['decodedSha256']
    assert allocation() - record['logicalBytesRetired'] < 498_000_000
    inactive()
    for p in [*paths, old_json]:
        p.unlink()
    for p in sorted(attempts.rglob('*'), key=lambda p:len(p.parts), reverse=True):
        assert p.is_dir()
        p.rmdir()
    print(json.dumps({'verifiedRetirementResumed': True,
                      'evidenceBytesAfter': allocation(),
                      'logicalBytesRetired': record['logicalBytesRetired']}))
    raise SystemExit(0)
before = allocation()
with archive.open('xb') as target:
    with lzma.LZMAFile(target, 'wb', preset=1) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
by_path = {r['originalPath']: r for r in rows}
seen = set()
with tarfile.open(archive, mode='r|xz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        with source.extractfile(member) as stream:
            assert member.size == row['bytes']
            assert hashlib.file_digest(stream, 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
decoded_hash, decoded_bytes = hashlib.sha256(), 0
with gzip.open(old_json, 'rb') as source, new_json.open('xb') as target:
    with lzma.LZMAFile(target, 'wb', preset=1) as packed:
        while block := source.read(65536):
            packed.write(block)
            decoded_hash.update(block)
            decoded_bytes += len(block)
            assert decoded_bytes < 64*1024*1024
with lzma.open(new_json, 'rb') as source:
    verified_hash, verified_bytes = hashlib.sha256(), 0
    while block := source.read(65536):
        verified_hash.update(block)
        verified_bytes += len(block)
assert verified_bytes == decoded_bytes and verified_hash.digest() == decoded_hash.digest()
record = dict(schema='complete-matrix-gate-retention-v1', archive=str(archive),
              archiveBytes=archive.stat().st_size, archiveSha256=digest(archive), members=rows,
              allDecodedOriginalsVerified=True, evidenceBytesBefore=before,
              evidenceCapExceededBefore=before > 500_000_000,
              logicalBytesRetired=sum(r['bytes'] for r in rows) + old_json.stat().st_size,
              inspectionTranscode=dict(originalPath=str(old_json), originalBytes=old_json.stat().st_size,
                  originalSha256=digest(old_json), path=str(new_json), bytes=new_json.stat().st_size,
                  sha256=digest(new_json), decodedBytes=decoded_bytes,
                  decodedSha256=decoded_hash.hexdigest(), exactDecodedPayloadPreserved=True),
              runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(raw)
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() - record['logicalBytesRetired'] < 498_000_000
inactive()
for p in [*paths, old_json]:
    p.unlink()
for p in sorted(attempts.rglob('*'), key=lambda p:len(p.parts), reverse=True):
    assert p.is_dir()
    p.rmdir()
print(json.dumps({**{k:v for k,v in record.items() if k!='members'},
                  'evidenceBytesAfter':allocation()}))
