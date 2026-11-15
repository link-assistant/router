"""Capture bounded complete Rust 1.89 reference sources without a checkout."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

revision = '9571d4d38cc580bd9fe926f97fccd98f215564a9'
folder = Path('tools/translation/source-profiles/shared-f64-method')
folder.mkdir(exist_ok=True)
rows = []
paths = ['src/expressions/method-call-expr.md', 'src/expressions/operator-expr.md',
         'src/expressions.md', 'LICENSE-MIT', 'LICENSE-APACHE']
for path in paths:
    raw = subprocess.check_output(['gh', 'api', 'repos/rust-lang/reference/contents/' + path
                                   + '?ref=' + revision, '--jq', '.content'])
    assert len(raw) <= 150000
    raw = base64.b64decode(raw)
    assert 0 < len(raw) <= 100000
    name = Path(path).name + '.gz'
    packed = gzip.compress(raw, mtime=0)
    target = folder / name
    assert not target.exists()
    target.write_bytes(packed)
    assert gzip.decompress(target.read_bytes()) == raw
    rows.append(dict(path=path, archive=name, bytes=len(raw),
                     sha256=hashlib.sha256(raw).hexdigest(),
                     archiveSha256=hashlib.sha256(packed).hexdigest(),
                     url='https://github.com/rust-lang/reference/blob/' + revision + '/' + path))
manifest = dict(schema='original-rust-reference-shared-f64-method-v1', rust='1.89.0',
                referenceRevision=revision, files=rows,
                rustSubmodule='https://github.com/rust-lang/rust/tree/1.89.0/src/doc/reference',
                scope='complete source evidence; no receiver or executable authority')
with (folder / 'manifest.json').open('x') as output:
    json.dump(manifest, output, indent=2)
    output.write('\n')
print(json.dumps(manifest))
