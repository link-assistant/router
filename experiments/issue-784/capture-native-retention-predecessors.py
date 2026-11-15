"""Capture the complete committed native source cohort before regeneration."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

commit = 'a7bcf9526b0835f634b900e91fc30fc9c8301581'
p = 'tools/translation/'
originals = ['private-output-text.mjs', 'retained-owned-field-bulk.mjs',
             'retained-owned-field-matrix-bulk.mjs', 'isolated-retained-owned-field-matrix-bulk.mjs',
             'owned-field-isolated-matrix-session.mjs', 'owned-field-isolated-matrix-profile.mjs']
targets = ['private-native-output-text.mjs', 'native-retained-owned-field-bulk.mjs',
           'native-retained-owned-field-matrix-bulk.mjs', 'isolated-native-retained-owned-field-matrix-bulk.mjs',
           'native-owned-field-isolated-matrix-session.mjs', 'native-owned-field-isolated-matrix-profile.mjs']
names = [p + name for name in originals + targets]
names += ['scripts/translate-router-owned-field-meta.mjs',
          'scripts/translate-router-native-owned-field-meta.mjs']
names += [p + name for name in ['prepare-native-output-text-retention.mjs',
                               'native-output-text-kernels.mjs', 'source-copy-native-bindings.mjs']]
rows = []
for name in names:
    raw = subprocess.check_output(['git', 'show', commit + ':' + name])
    text = raw.decode('utf8')
    assert text.encode() == raw
    rows.append({'path': name, 'source': text, 'bytes': len(raw),
                 'sha256': hashlib.sha256(raw).hexdigest()})
packet = {'schema': 'complete-native-retention-predecessor-sources-v1',
          'commit': commit, 'files': rows, 'semanticAuthority': False,
          'performanceQualified': False, 'rustExecuted': False}
raw = (json.dumps(packet, separators=(',', ':'), ensure_ascii=True) + '\n').encode()
target = Path('tools/translation/source-profiles/native-output-text-retention/complete-predecessors.json.gz')
target.parent.mkdir(parents=True, exist_ok=True)
with target.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(raw)['files']:
    original = subprocess.check_output(['git', 'show', commit + ':' + row['path']])
    assert original == row['source'].encode()
print(json.dumps({'path': str(target), 'bytes': target.stat().st_size,
                  'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                  'decodedBytes': len(raw), 'decodedSha256': hashlib.sha256(raw).hexdigest(),
                  'completeSources': len(rows), 'completeGitReadbackVerified': True}))
