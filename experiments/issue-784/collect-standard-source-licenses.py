"""Retain complete upstream licenses beside the uninstalled Rust source study."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path('experiments/issue-784/standard-network-path-inputs-v2')
manifest = json.loads((root / 'manifest.json').read_text())
revision = manifest['sources'][0]['revision']
assert all(row['revision'] == revision for row in manifest['sources'])
rows = []
for name in ['LICENSE-APACHE', 'LICENSE-MIT']:
    response = json.loads(subprocess.check_output(['gh', 'api',
                          'repos/rust-lang/rust/contents/'+name+'?ref='+revision]))
    assert response['type'] == 'file' and response['path'] == name and response['encoding'] == 'base64'
    raw = base64.b64decode(''.join(response['content'].split()), validate=True)
    assert 0 < len(raw) <= 20000 and len(raw) == response['size']
    assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\x00'+raw).hexdigest() == response['sha']
    packed = gzip.compress(raw, mtime=0)
    with (root / (name+'.gz')).open('xb') as stream:
        stream.write(packed)
    assert gzip.decompress((root / (name+'.gz')).read_bytes()) == raw
    rows.append(dict(path=name, archive=name+'.gz', bytes=len(raw),
                     sha256=hashlib.sha256(raw).hexdigest(), packedBytes=len(packed),
                     packedSha256=hashlib.sha256(packed).hexdigest()))
with (root / 'license-manifest.json').open('x') as stream:
    json.dump(dict(revision=revision, files=rows), stream, indent=2)
(root / 'NOTICE.md').write_text(
    '# Uninstalled Rust namespace source study\n\n'
    'Complete rust-lang/rust source files from Rust 1.89.0, commit '+revision+'.\n'
    'Copyright and author notices remain in the source. The complete upstream\n'
    'Apache-2.0 and MIT licenses accompany this research as compressed files.\n'
    'No namespace, layout, constructor, executable or runtime authority is granted.\n')
print(json.dumps(dict(revision=revision, licenses=rows, sourceInstalled=False)))
