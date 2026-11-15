"""Compare every full equation, then repack only the verified task proposals."""
import gzip
import hashlib
import json
import lzma
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
names = ['current-trace-native-history-proposal', 'current-trace-native-shared-proposal']
paths = [base / (name + '.json.gz') for name in names]
raws = [gzip.decompress(path.read_bytes()) for path in paths]
plans = [json.loads(raw) for raw in raws]
before, after = plans
assert hashlib.sha256(paths[0].read_bytes()).hexdigest() == '9b8cf57b6a535af4339f378f84f7e9bcae4f0be7360ae67c09b27317d103359f'
assert before['traceFiles'] == after['traceFiles']
assert before['history'] == after['history'] and before['traceHistory'] == after['traceHistory']
assert before['prerequisites'] == after['prerequisites']
physical_changes = []
for previous, current in zip(before['files'], after['files'], strict=True):
    assert Path(current['path']).read_text() == current['after'] == current['current']
    if previous['current'] != current['current']:
        physical_changes.append(current['path'])
        assert previous['current'] == before['traceFiles'][before['files'].index(previous)]['after']
    previous['current'] = current['current']
    assert previous == current
assert physical_changes == ['tools/translation/native-owned-field-isolated-matrix-session.mjs',
                            'tools/translation/native-owned-field-isolated-matrix-profile.mjs']
assert [row['path'] for row in before['inputs']] == [row['path'] for row in after['inputs']]
input_changes = [a['path'] for a, b in zip(before['inputs'], after['inputs'], strict=True) if a != b]
assert input_changes == physical_changes + ['tools/translation/prepare-native-output-text-retention.mjs',
                           'tools/translation/prepare-current-native-output-text-retention.mjs']
for row in after['inputs']:
    assert hashlib.sha256(Path(row['path']).read_bytes()).hexdigest() == row['sha256']
records = []
for path, raw in zip(paths, raws, strict=True):
    target = path.with_suffix('').with_suffix('.json.xz')
    packed = lzma.compress(raw, preset=1)
    with target.open('xb') as output:
        output.write(packed)
    assert lzma.decompress(target.read_bytes()) == raw
    records.append({'originalPath': str(path), 'originalPackedBytes': path.stat().st_size,
        'originalPackedSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'path': str(target),
        'packedBytes': len(packed), 'packedSha256': hashlib.sha256(packed).hexdigest(),
        'decodedBytes': len(raw), 'decodedSha256': hashlib.sha256(raw).hexdigest(), 'fullReadbackVerified': True})
result = {'completeTraceRowsEqual': 7, 'completeCurrentRowsEqualExceptInstalledPhysicalBeforeimages': 7,
    'physicalChanges': physical_changes, 'inputChanges': input_changes, 'records': records,
    'semanticChecksReused': False, 'fullGatePassed': False, 'originalReceivingPassed': False}
receipt = base / 'current-trace-native-equation-comparison.json'
with receipt.open('x') as output:
    json.dump(result, output, indent=2)
for path, raw in zip(paths, raws, strict=True):
    assert gzip.decompress(path.read_bytes()) == raw
    path.unlink()
print(json.dumps(result))
