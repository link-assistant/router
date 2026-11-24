"""Retain exact four historical Git originals as comparison DATA, never authority."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

revision = '088e4772d42cecc544f6ea260fef6a8af89bad03'
names = ['ascii-runtime-assets.mjs', 'ascii-runtime-assets-source-data.mjs',
         'ascii-base-runtime-assets.mjs', 'ascii-base-runtime-assets-source-data.mjs']
target = Path('tools/translation/test/fixtures/ascii-asset-historical-outputs.json.gz')
assert not target.exists()
rows = []
for name in names:
    path = 'tools/translation/' + name
    raw = subprocess.check_output(['git', 'show', revision + ':' + path])
    blob = subprocess.check_output(['git', 'rev-parse', revision + ':' + path], text=True).strip()
    assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == blob
    source = raw.decode('utf-8')
    assert source.encode('utf-8') == raw
    rows.append({'path': path, 'source': source, 'bytes': len(raw), 'gitBlob': blob,
                 'sha256': hashlib.sha256(raw).hexdigest()})
record = {'schema': 'complete-historical-ascii-asset-outputs-v1', 'revision': revision,
          'files': rows, 'sourceAuthority': False, 'semanticAuthority': False}
raw = json.dumps(record, separators=(',', ':'), ensure_ascii=True).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
assert json.loads(gzip.decompress(packed)) == record
with target.open('xb') as output:
    output.write(packed)
for row in json.loads(gzip.decompress(target.read_bytes()))['files']:
    original = subprocess.check_output(['git', 'show', revision + ':' + row['path']])
    assert row['source'].encode('utf-8') == original
print(json.dumps({'path': str(target), 'bytes': len(packed),
                  'sha256': hashlib.sha256(packed).hexdigest(), 'rawBytes': len(raw),
                  'rawSha256': hashlib.sha256(raw).hexdigest(),
                  'files': [{key: value for key, value in row.items() if key != 'source'}
                            for row in rows]}))
