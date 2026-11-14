"""Retain complete pre-batching source producers as deterministic pinned data."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

original_commit = '1586be711ca0a85c5408565bd150341e12d7f1d5'
root = Path('tools/translation/source-profiles/named-core-producers')
root.mkdir(exist_ok=True)
files = []
for name in ['prepare-core-unit-matches.mjs', 'prepare-core-unicode-predicates.mjs']:
    path = Path('tools/translation') / name
    raw = subprocess.check_output(['git', 'show', original_commit + ':' + str(path)])
    files.append({'path': str(path), 'source': raw.decode(), 'bytes': len(raw),
                  'sha256': hashlib.sha256(raw).hexdigest()})
raw = (json.dumps({'schema': 'named-core-producers-originals-v1', 'files': files},
                  ensure_ascii=False, separators=(',', ':')) + '\n').encode()
packed = gzip.compress(raw, compresslevel=9, mtime=0)
assert gzip.decompress(packed) == raw
assert hashlib.sha256(raw).hexdigest() == '80431f90646136d06abc160f489f3e5e3e2f23d6eaeb52fab9b992f382d077a9'
assert hashlib.sha256(packed).hexdigest() == 'b01ea4c263830574db79c862aa91fa571cc1e9c1aa8445d772654f9959d75f6e'
archive = root / 'originals.json.gz'
if archive.exists():
    assert archive.read_bytes() == packed, 'Refusing to replace retained original producers'
else:
    archive.write_bytes(packed)
manifest = {'schema': 'named-core-producers-originals-v1', 'archive': 'originals.json.gz',
            'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'archiveBytes': len(packed), 'archiveSha256': hashlib.sha256(packed).hexdigest()}
manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
target = root / 'manifest.json'
if target.exists():
    assert target.read_bytes() == manifest_bytes, 'Refusing to replace original manifest'
else:
    target.write_bytes(manifest_bytes)
print(json.dumps(manifest))
