"""Retain complete licensed Rust 1.89 prelude trait inputs within finite bounds."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

folder = Path('tools/translation/source-profiles/shared-f64-prelude')
folder.mkdir(exist_ok=True)
paths = ['library/core/src/' + path for path in [
    'marker.rs', 'ops/drop.rs', 'ops/function.rs', 'ops/async_function.rs',
    'convert/mod.rs', 'iter/traits/iterator.rs', 'iter/traits/double_ended.rs',
    'iter/traits/exact_size.rs', 'iter/traits/collect.rs', 'clone.rs', 'cmp.rs',
    'default.rs', 'future/into_future.rs', 'future/future.rs', 'prelude/v1.rs', 'prelude/mod.rs',
]] + ['library/std/src/prelude/v1.rs', 'library/std/src/prelude/mod.rs',
      'library/alloc/src/borrow.rs', 'library/alloc/src/string.rs', 'LICENSE-MIT', 'LICENSE-APACHE']
rows, total = [], 0
for path in paths:
    encoded = subprocess.check_output(['gh', 'api', 'repos/rust-lang/rust/contents/' + path
                                      + '?ref=1.89.0', '--jq', '.content'])
    assert len(encoded) <= 500000
    raw = base64.b64decode(encoded)
    assert 0 < len(raw) <= 300000
    total += len(raw)
    assert total <= 1500000
    name = path.replace('/', '-') + '.gz'
    packed = gzip.compress(raw, mtime=0)
    target = folder / name
    if target.exists():
        assert gzip.decompress(target.read_bytes()) == raw
    else:
        target.write_bytes(packed)
    assert gzip.decompress(target.read_bytes()) == raw
    rows.append(dict(path=path, archive=name, bytes=len(raw),
                     sha256=hashlib.sha256(raw).hexdigest(),
                     archiveSha256=hashlib.sha256(packed).hexdigest(),
                     url='https://github.com/rust-lang/rust/blob/1.89.0/' + path))
manifest = dict(schema='original-rust-prelude-f64-method-absence-v1', rust='1.89.0',
                files=rows, bytes=total, scope='complete original source data; no dispatch authority')
with (folder / 'manifest.json').open('x') as output:
    json.dump(manifest, output, indent=2)
    output.write('\n')
print(json.dumps(manifest))
