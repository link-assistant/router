"""Census every original isolated compiler input against complete current bytes."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
path = root / 'tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz'
packed = path.read_bytes()
raw = gzip.decompress(packed)
registry = json.loads(raw)
if registry['files'] != len(registry['sources']) or registry['files'] > 2048:
    raise RuntimeError('Complete finite original registry required')
rows = []
for original in registry['sources']:
    source = root / original['path']
    if source.is_symlink() or not source.is_file():
        raise RuntimeError('Complete ordinary current source file required')
    state = source.stat()
    with source.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    mode = '100755' if state.st_mode & 0o111 else '100644'
    if source.stat() != state:
        raise RuntimeError('Current source identity changed during census')
    rows.append({'path': original['path'], 'original': original,
                 'actual': {'bytes': state.st_size, 'sha256': digest, 'mode': mode},
                 'matches': state.st_size == original['bytes']
                            and digest == original['sha256'] and mode == original['mode']})
result = {'schema': 'complete-isolated-registry-census-v1', 'registry': registry,
          'registryPackedSha256': hashlib.sha256(packed).hexdigest(),
          'registryRawSha256': hashlib.sha256(raw).hexdigest(), 'rows': rows,
          'changed': [row['path'] for row in rows if not row['matches']],
          'includesNewCompilerFiles': False, 'installed': False, 'semanticAuthority': False}
encoded = json.dumps(result, separators=(',', ':')).encode()
if len(encoded) > 4 * 1024 * 1024:
    raise RuntimeError('Complete census exceeds finite evidence bound')
target = root / 'ci-logs/issue-784-restart-2/isolated-registry-current-census.json.gz'
with target.open('xb') as stream:
    stream.write(gzip.compress(encoded, mtime=0))
with gzip.open(target, 'rb') as stream:
    if stream.read() != encoded:
        raise RuntimeError('Complete census readback differs')
print(json.dumps({'files': len(rows), 'changed': result['changed'],
                  'originalRegistryPreserved': path.read_bytes() == packed,
                  'output': str(target), 'bytes': len(encoded),
                  'sha256': hashlib.sha256(encoded).hexdigest()}))
