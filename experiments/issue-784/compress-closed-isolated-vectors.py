"""Compress complete closed isolated-receiver vectors with full readback."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
folders = [directory / ('current-isolated-' + engine + '-vectors')
           for engine in ['node', 'bun']]
target = directory / 'current-isolated-vector-compression.json'
if target.exists():
    raise RuntimeError('Fresh compression receipt required')
for engine in ['node', 'bun']:
    receipt = json.loads((directory / ('current-isolated-' + engine + '.memory.json')).read_bytes())
    if receipt['exitCode'] != 0 or receipt['stopped'] or Path('/proc', str(receipt['pid'])).exists():
        raise RuntimeError('Complete successful inactive receiver required')
paths = sorted(path for folder in folders for path in folder.iterdir())
if not paths or len(paths) > 128 or sum(path.stat().st_size for path in paths) > 64 * 1024 * 1024:
    raise RuntimeError('Finite closed vector selection required')
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        descriptors = list((process / 'fd').iterdir())
    except OSError:
        continue
    for descriptor in descriptors:
        try:
            opened = os.readlink(descriptor)
        except OSError:
            continue
        if any(opened.startswith(str(folder) + '/') for folder in folders):
            raise RuntimeError('A selected vector is still open')
rows = []
def identity(state):
    return tuple(getattr(state, name) for name in
                 ['st_dev', 'st_ino', 'st_mode', 'st_size', 'st_mtime_ns', 'st_ctime_ns'])


for path in paths:
    if path.is_symlink() or not path.is_file() or path.suffix != '.json':
        raise RuntimeError('Complete ordinary original JSON vector required')
    state = path.stat()
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    packed = path.with_suffix('.json.gz')
    with path.open('rb') as source, packed.open('xb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', mtime=0) as output:
            shutil.copyfileobj(source, output, 65536)
    with gzip.open(packed, 'rb') as stream:
        readback = hashlib.file_digest(stream, 'sha256').hexdigest()
    if readback != digest or identity(path.stat()) != identity(state):
        raise RuntimeError('Complete original/readback identity differs')
    with packed.open('rb') as stream:
        packed_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    rows.append({'originalPath': str(path), 'bytes': state.st_size, 'sha256': digest,
                 'compressedPath': str(packed), 'compressedBytes': packed.stat().st_size,
                 'compressedSha256': packed_hash, 'fullDecodedOriginalVerified': True})
with target.open('x') as output:
    json.dump({'schema': 'complete-closed-isolated-vector-compression-v1',
               'rows': rows, 'allDecodedOriginalsVerified': True}, output, indent=2)
    output.write('\n')
for row in rows:
    path = Path(row['originalPath'])
    with path.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != row['sha256']:
            raise RuntimeError('Complete original changed before duplicate removal')
    path.unlink()
print(json.dumps({'receipt': str(target), 'files': len(rows),
                  'originalBytes': sum(row['bytes'] for row in rows),
                  'compressedBytes': sum(row['compressedBytes'] for row in rows),
                  'allDecodedOriginalsVerified': True}))
