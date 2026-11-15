"""Join complete bounded native build profiles; report sampled costs, not gains."""
import base64
import gc
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
labels = ['baseline', 'batch-candidate', 'batch-candidate-qualified']
limit = 64 * 1024 * 1024


def complete(path):
    with gzip.open(path, 'rb') as stream:
        raw = stream.read(limit + 1)
        if len(raw) > limit or stream.read(1):
            raise ValueError('Complete profile exceeds original bound')
    return raw


results = []
expected_outputs = None
for label in labels:
    prefix = base / ('native-typescript-' + label)
    result = json.loads(Path(str(prefix) + '-result.json').read_bytes())
    raw = complete(Path(str(prefix) + '-cpu.json.gz'))
    assert len(raw) == result['cpu']['bytes']
    assert hashlib.sha256(raw).hexdigest() == result['cpu']['sha256']
    profile = json.loads(raw)
    del raw
    nodes = {row['id']: row for row in profile['nodes']}
    assert len(nodes) == len(profile['nodes'])
    parents = {}
    for row in nodes.values():
        for child in row.get('children', []):
            assert child in nodes and child not in parents
            parents[child] = row['id']
    assert len(parents) == len(nodes) - 1
    samples, deltas = profile['samples'], profile['timeDeltas']
    assert len(samples) == len(deltas)
    costs, negative_deltas = {}, []
    for index, (selected, micros) in enumerate(zip(samples, deltas)):
        assert selected in nodes and type(micros) is int
        if micros < 0:
            negative_deltas.append({'index': index, 'node': selected, 'micros': micros})
        at, seen_nodes, seen_frames = selected, set(), set()
        while at is not None:
            assert at not in seen_nodes
            seen_nodes.add(at)
            frame = nodes[at]['callFrame']
            key = (frame['url'], frame['functionName'],
                   frame['lineNumber'], frame['columnNumber'])
            cost = costs.setdefault(key, [0, 0])
            if at == selected:
                cost[0] += micros
            if key not in seen_frames:
                cost[1] += micros
                seen_frames.add(key)
            at = parents.get(at)
    frames = [dict(zip(['url', 'functionName', 'lineNumber', 'columnNumber'], key),
                   selfMicros=value[0], inclusiveMicros=value[1])
              for key, value in costs.items()]
    timing = {'signedSampleMicros': sum(deltas),
              'profileDurationMicros': profile['endTime'] - profile['startTime'],
              'allNegativeDeltas': negative_deltas}
    del profile, nodes, parents, samples, deltas, costs
    gc.collect()
    raw = complete(Path(str(prefix) + '-outputs.json.gz'))
    assert len(raw) == result['completeOutputs']['bytes']
    assert hashlib.sha256(raw).hexdigest() == result['completeOutputs']['sha256']
    outputs = json.loads(raw)['rows']
    joined = []
    for row in outputs:
        value = row['value'].encode() if row['kind'] == 'utf8' else base64.b64decode(row['value'], validate=True)
        assert len(value) == row['bytes']
        assert hashlib.sha256(value).hexdigest() == row['sha256']
        joined.append({key: row[key] for key in ['path', 'kind', 'bytes', 'sha256']})
    assert len(joined) == result['outputs']
    assert sum(row['bytes'] for row in joined) == result['completeOutputBytes']
    if expected_outputs is None:
        expected_outputs = raw
    else:
        assert raw == expected_outputs
    results.append({'measurement': result, 'timing': timing,
                    'allFrames': frames, 'allOutputs': joined})
    del raw, outputs, joined, frames
    gc.collect()

qualification = json.loads((base / 'native-typescript-premature-candidate-qualification.json').read_bytes())
report = {'schema': 'native-typescript-complete-profile-analysis-v1',
          'measurements': results, 'prematureMeasurementQualification': qualification,
          'method': 'Full original profiles and outputs rehashed; every sample attributed to its leaf and unique ancestor frames. Original signed clock deltas, including every negative delta, remain unmodified. Inclusive values overlap and cannot be added.',
          'limitations': 'Standalone baseline differs from regeneration writes. Premature candidate ran original source. Sampling, warmup and environment are uncontrolled; no original deadline qualification or measured speed gain.',
          'runtimeParity': False, 'fullGatePassed': False, 'productionExecutableGain': 0}
raw = (json.dumps(report, separators=(',', ':')) + '\n').encode()
target = base / 'native-typescript-complete-profile-analysis.json.gz'
with target.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert complete(target) == raw
for row in results:
    print(json.dumps({'label': row['measurement']['label'],
                      'topSelf': sorted(row['allFrames'], key=lambda value: value['selfMicros'], reverse=True)[:8],
                      'topInclusive': sorted(row['allFrames'], key=lambda value: value['inclusiveMicros'], reverse=True)[:8]}))
print(json.dumps({'report': str(target), 'completeDecodedBytes': len(raw),
                  'sha256': hashlib.sha256(raw).hexdigest(), 'allOriginalOutputsEqual': True}))
