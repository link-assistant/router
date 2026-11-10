"""Keep complete decoded diagnostics while retiring inactive compressed wrappers."""
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path
import stat

base = Path('ci-logs/issue-784-restart-2')
names = ['current-unit-unicode-source-proposal.json.xz',
         'current-parser-history-equation-batch-probe-v2.json.xz',
         'current-native-regeneration-source-origin-cpu.json.gz',
         'receiving-batch-registration-refresh.json.gz',
         'computed-index-registration-refresh.json.gz',
         'current-after-fixtures-registration-refresh.json.xz',
         'current-after-ascii-registration-refresh.json.xz']
rows = []


def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return [s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns]


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def inactive(path, before):
    assert identity(path) == before
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            fds = list((process / 'fd').iterdir())
        except (FileNotFoundError, PermissionError):
            continue
        for fd in fds:
            try:
                s = fd.stat()
            except (FileNotFoundError, ProcessLookupError):
                continue
            assert [s.st_dev, s.st_ino] != before[:2]


for name in names:
    path = base / name
    before = identity(path)
    inactive(path, before)
    outer_sha = digest(path)
    target = path.with_name(path.stem + '-dense.json.xz')
    assert not target.exists()
    length, sha = 0, hashlib.sha256()
    opener = gzip.open if path.suffix == '.gz' else lzma.open
    with opener(path, 'rb') as source, lzma.open(target, 'xb', preset=6) as packed:
        while block := source.read(65536):
            length += len(block)
            assert length <= 256 * 1024 * 1024
            sha.update(block)
            packed.write(block)
    verify_sha, verify_length = hashlib.sha256(), 0
    with lzma.open(target, 'rb') as source:
        while block := source.read(65536):
            verify_sha.update(block)
            verify_length += len(block)
    assert verify_length == length and verify_sha.digest() == sha.digest()
    inactive(path, before)
    assert digest(path) == outer_sha
    row = dict(originalPath=str(path), originalBytes=before[2], originalSha256=outer_sha,
               retainedPath=str(target), retainedBytes=target.stat().st_size,
               retainedSha256=digest(target), completeDecodedBytes=length,
               completeDecodedSha256=sha.hexdigest(), completeDecodedPayloadRetained=True,
               oldCompressedContainerBytesRetained=False, onlyInactiveTaskArtifacts=True)
    if row['retainedBytes'] >= row['originalBytes']:
        target.unlink()
        row.update(retainedPath=str(path), retainedBytes=before[2], retainedSha256=outer_sha,
                   oldCompressedContainerBytesRetained=True)
    else:
        path.unlink()
    row['logicalBytesReclaimed'] = row['originalBytes'] - row['retainedBytes']
    rows.append(row)
    print(json.dumps(row), flush=True)
receipt = Path('docs/case-studies/issue-784/evidence/inactive-diagnostic-container-custody-20261110.json.gz')
data = json.dumps(dict(schema='complete-inactive-diagnostic-container-custody-v1', rows=rows,
                       logicalBytesReclaimed=sum(r['logicalBytesReclaimed'] for r in rows))).encode()
with receipt.open('xb') as stream:
    stream.write(gzip.compress(data, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == data
