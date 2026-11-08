"""Retain complete original ASCII source preparers before batching."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

original_commit = '71972481e'
root = Path('tools/translation/source-profiles/named-ascii-producers')
root.mkdir(exist_ok=True)
files = []
for name in ['prepare-core-ascii-reverse-sources.mjs',
             'prepare-owned-core-private-analysis-retention.mjs']:
    path = Path('tools/translation') / name
    raw = subprocess.check_output(['git', 'show', original_commit + ':' + str(path)])
    files.append({'path': str(path), 'source': raw.decode(), 'bytes': len(raw),
                  'sha256': hashlib.sha256(raw).hexdigest()})
raw = (json.dumps({'schema': 'named-ascii-producers-originals-v1', 'files': files},
                  ensure_ascii=False, separators=(',', ':')) + '\n').encode()
packed = gzip.compress(raw, compresslevel=9, mtime=0)
assert gzip.decompress(packed) == raw
archive = root / 'originals.json.gz'
if archive.exists():
    assert archive.read_bytes() == packed, 'Refusing to replace original source archive'
else:
    archive.write_bytes(packed)
manifest = {'schema': 'named-ascii-producers-originals-v1', 'archive': archive.name,
            'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'archiveBytes': len(packed), 'archiveSha256': hashlib.sha256(packed).hexdigest()}
target = root / 'manifest.json'
wire = (json.dumps(manifest, indent=2) + '\n').encode()
if target.exists():
    assert target.read_bytes() == wire, 'Refusing to replace original manifest'
else:
    target.write_bytes(wire)
print(json.dumps(manifest))
