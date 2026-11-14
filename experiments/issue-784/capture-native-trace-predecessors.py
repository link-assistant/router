"""Retain the complete actual pre-trace source cohort, including prior outputs."""
import gzip
import hashlib
import json
from pathlib import Path

prefix = 'tools/translation/'
inputs = [prefix + name for name in ['private-output-text.mjs', 'retained-owned-field-bulk.mjs',
    'retained-owned-field-matrix-bulk.mjs', 'isolated-retained-owned-field-matrix-bulk.mjs',
    'owned-field-isolated-matrix-session.mjs', 'owned-field-isolated-matrix-profile.mjs']]
inputs.append('scripts/translate-router-owned-field-meta.mjs')
outputs = [prefix + name for name in ['private-native-output-text.mjs', 'native-retained-owned-field-bulk.mjs',
    'native-retained-owned-field-matrix-bulk.mjs', 'isolated-native-retained-owned-field-matrix-bulk.mjs',
    'native-owned-field-isolated-matrix-session.mjs', 'native-owned-field-isolated-matrix-profile.mjs']]
outputs.append('scripts/translate-router-native-owned-field-meta.mjs')
installation = json.load(gzip.open('ci-logs/issue-784-restart-2/current-trace-owned-field-install.json.gz', 'rt'))
previous = {row['path']: row['source'] for row in installation['current']}
files = []
for path in inputs + outputs:
    source = previous[path] if path in previous else Path(path).read_text()
    raw = source.encode()
    files.append({'path': path, 'source': source, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
data = {'schema': 'complete-native-matrix-trace-predecessors-v1',
    'commit': '52e2c0461f00e79a1dcd04b475138acd3ec28d17', 'files': files,
    'semanticAuthority': False, 'performanceQualified': False}
raw = json.dumps(data, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
path = Path(prefix + 'source-profiles/native-output-text-retention/matrix-trace-predecessors.json.gz')
with path.open('xb') as target:
    target.write(packed)
assert gzip.decompress(path.read_bytes()) == raw
print(json.dumps({'path': str(path), 'bytes': len(packed), 'sha256': hashlib.sha256(packed).hexdigest(),
    'decodedBytes': len(raw), 'decodedSha256': hashlib.sha256(raw).hexdigest(), 'files': len(files),
    'equationsVerified': False, 'nativeOutputsInstalled': False}))
