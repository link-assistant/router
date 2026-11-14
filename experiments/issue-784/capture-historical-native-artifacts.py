"""Preserve the complete matching pre-privacy native artifact cohort from Git."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

REVISION = 'eb2dad1c0a18394dc1aad46413e11401e74eb502'
TARGET = Path('tools/translation/fixtures/historical-native-portable-artifacts.json.gz')
SOURCE = Path('tools/translation/fixtures/historical-native-source.json.gz')
assert not TARGET.exists()
packed = SOURCE.read_bytes()
assert hashlib.sha256(packed).hexdigest() == '95b4576068df3bd2950509dfab7ae06965534fafc73e9543c38fca141e8a4ca6'
originals = {row['path']: row for row in json.loads(gzip.decompress(packed))['files']}


def read(path):
    return subprocess.check_output(['git', 'show', REVISION + ':' + path])


manifest_path = 'parity/js-native-portable-draft.json'
translation_path = 'parity/js-first-translation.json'
manifest_bytes = read(manifest_path)
translation_bytes = read(translation_path)
manifest = json.loads(manifest_bytes)
translation = json.loads(translation_bytes)
assert len(manifest['modules']) == len(translation['nativeCoverage']) == 52
outputs = []
for module in manifest['modules']:
    source = originals[module['path']]
    assert source['sha256'] == module['sha256'] and source['bytes'] == module['bytes']
    coverage = [row for row in translation['nativeCoverage'] if row['path'] == module['path']]
    assert len(coverage) == 1 and coverage[0]['sha256'] == source['sha256']
    assert len(module['outputs']) == 6
    outputs.extend(module['outputs'])
assert len({row['path'] for row in outputs}) == len(outputs) == 312

files = []
for path, expected in [(manifest_path, None), (translation_path, None)] + [
        (row['path'], row) for row in outputs]:
    data = read(path)
    digest = hashlib.sha256(data).hexdigest()
    if expected is not None:
        assert expected['bytes'] == len(data) and expected['sha256'] == digest
    files.append({'path': path, 'source': data.decode('utf8'),
                  'bytes': len(data), 'sha256': digest})

packet = {'schema': 'historical-native-portable-artifacts-v1',
          'revision': REVISION, 'sourceArchiveSha256': hashlib.sha256(packed).hexdigest(),
          'files': files, 'runtimeParity': False, 'currentFreshness': False}
raw = (json.dumps(packet, separators=(',', ':')) + '\n').encode()
assert len(raw) < 32 * 1024 * 1024
compressed = gzip.compress(raw, compresslevel=9, mtime=0)
assert gzip.decompress(compressed) == raw
with TARGET.open('xb') as output:
    output.write(compressed)
assert TARGET.read_bytes() == compressed
print(json.dumps({'path': str(TARGET), 'revision': REVISION, 'files': len(files),
                  'bytes': len(compressed), 'sha256': hashlib.sha256(compressed).hexdigest(),
                  'decodedBytes': len(raw), 'decodedSha256': hashlib.sha256(raw).hexdigest(),
                  'completeOriginalsPreserved': True, 'currentFreshness': False}))
