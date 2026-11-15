"""Collect bounded pinned upstream source for an uninstalled namespace study.

No compiler source or namespace authority changes. GitHub source responses are
retained in full with the exact Rust tag target and complete decoded identities.
"""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path('experiments/issue-784/standard-network-path-inputs-v2')
if root.exists():
    assert root.is_dir() and not root.is_symlink()
    assert all(path.name.startswith('library--') and path.name.endswith('.rs.gz')
               and path.is_file() and not path.is_symlink() for path in root.iterdir())
else:
    root.mkdir()
paths = ['library/std/src/net/mod.rs', 'library/std/src/net/ip_addr.rs',
         'library/std/src/net/socket_addr.rs',
         'library/core/src/net/mod.rs', 'library/core/src/net/ip_addr.rs',
         'library/core/src/net/socket_addr.rs', 'library/std/src/path.rs']
ref = json.loads(subprocess.check_output(['gh', 'api',
                 'repos/rust-lang/rust/git/ref/tags/1.89.0']))
assert ref['object']['type'] == 'tag'
tag = json.loads(subprocess.check_output(['gh', 'api',
                 'repos/rust-lang/rust/git/tags/' + ref['object']['sha']]))
assert tag['object']['type'] == 'commit'
revision = tag['object']['sha']
rows = []
for path in paths:
    response_bytes = subprocess.check_output(['gh', 'api',
          'repos/rust-lang/rust/contents/' + path + '?ref=' + revision])
    assert len(response_bytes) <= 400000
    response = json.loads(response_bytes)
    assert response['type'] == 'file' and response['path'] == path
    assert response['encoding'] == 'base64'
    raw = base64.b64decode(''.join(response['content'].split()), validate=True)
    assert 0 < len(raw) <= 200000
    assert len(raw) == response['size']
    assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\x00' + raw).hexdigest() == response['sha']
    source = raw.decode('utf-8')
    assert '\x00' not in source and '\n' in source
    name = path.replace('/', '--') + '.gz'
    packed = gzip.compress(raw, mtime=0)
    if (root / name).exists():
        assert (root / name).read_bytes() == packed
    else:
        with (root / name).open('xb') as stream:
            stream.write(packed)
    assert gzip.decompress((root / name).read_bytes()) == raw
    rows.append(dict(path=path, revision=revision, archive=name,
                     url='https://raw.githubusercontent.com/rust-lang/rust/'+revision+'/'+path,
                     bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                     archiveBytes=len(packed), archiveSha256=hashlib.sha256(packed).hexdigest()))
with (root / 'manifest.json').open('x') as stream:
    json.dump(dict(schema='uninstalled-standard-network-path-sources-v1', tagRef=ref,
                   tagObject=tag, sources=rows, sourceInstalled=False,
                   namespaceAuthority=False, runtimeAuthority=False), stream, indent=2)
print(json.dumps(dict(revision=revision, sources=len(rows),
                     completeSourceBytes=sum(row['bytes'] for row in rows),
                     sourceInstalled=False, namespaceAuthority=False)))
