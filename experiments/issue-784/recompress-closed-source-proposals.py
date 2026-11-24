"""Retain complete closed JSON payloads in XZ, with explicit container custody."""
import gzip
import hashlib
import io
import json
import lzma
import os
from pathlib import Path
import stat

base = Path('ci-logs/issue-784-restart-2')
names = ['current-unit-unicode-source-proposal.json.gz',
         'current-runtime-import-composition-proposal.json.gz']
receipt = base / 'current-closed-source-proposal-container-custody.json'
assert not receipt.exists()
selected = {str((base / name).resolve()) for name in names}
def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd) not in selected
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in selected
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
rows = []
inactive()
for name in names:
    path = base / name
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    with path.open('rb') as source:
        outer_digest = hashlib.file_digest(source, 'sha256').hexdigest()
    compressor = lzma.LZMACompressor(preset=1)
    digest, length, parts = hashlib.sha256(), 0, []
    with gzip.open(path, 'rb') as source:
        while block := source.read(65536):
            length += len(block)
            assert length <= 256 * 1024 * 1024
            digest.update(block)
            parts.append(compressor.compress(block))
    parts.append(compressor.flush())
    packed = b''.join(parts)
    assert len(packed) < state.st_size
    target = path.with_suffix('.xz')
    assert not target.exists()
    decoded_digest, decoded_length = hashlib.sha256(), 0
    with lzma.open(io.BytesIO(packed), 'rb') as source:
        while block := source.read(65536):
            decoded_digest.update(block)
            decoded_length += len(block)
    assert decoded_length == length and decoded_digest.digest() == digest.digest()
    inactive()
    with target.open('xb') as output:
        output.write(packed)
    verify_digest, verify_length = hashlib.sha256(), 0
    with lzma.open(target, 'rb') as source:
        while block := source.read(65536):
            verify_digest.update(block)
            verify_length += len(block)
    assert verify_length == length and verify_digest.digest() == digest.digest()
    after = path.lstat()
    assert (after.st_dev, after.st_ino, after.st_mode, after.st_uid,
            after.st_nlink, after.st_size, after.st_mtime_ns, after.st_ctime_ns) == (
            state.st_dev, state.st_ino, state.st_mode, state.st_uid,
            state.st_nlink, state.st_size, state.st_mtime_ns, state.st_ctime_ns)
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == outer_digest
    inactive()
    row = {'originalPath': str(path), 'originalContainerBytes': state.st_size,
           'originalContainerSha256': outer_digest, 'retainedPath': str(target),
           'retainedBytes': len(packed), 'retainedSha256': hashlib.sha256(packed).hexdigest(),
           'completeDecodedBytes': length, 'completeDecodedSha256': digest.hexdigest(),
           'completeDecodedPayloadRetained': True, 'originalOuterCompressedStreamRetained': False,
           'logicalBytesReclaimed': state.st_size - len(packed),
           'temporaryReplacementOutputBytes': len(packed)}
    rows.append(row)
    path.unlink()
    print(json.dumps(row), flush=True)
with receipt.open('x') as output:
    json.dump({'schema': 'complete-closed-source-proposal-container-custody-v1',
               'rows': rows, 'fullDecodedOriginalsVerified': True,
               'oldOuterCompressedStreamsRetained': False,
               'logicalBytesReclaimed': sum(row['logicalBytesReclaimed'] for row in rows),
               'rustExecuted': False}, output)
