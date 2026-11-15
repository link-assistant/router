"""Attribute every signed CPU sample in one complete current regeneration."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('prefix')
args = parser.parse_args()
base = Path('ci-logs/issue-784-restart-2') / args.prefix
receipt = json.loads(Path(str(base) + '-result.json').read_bytes())
with gzip.open(receipt['profilePath'], 'rb') as stream:
    raw = stream.read(64 * 1024 * 1024 + 1)
    assert len(raw) <= 64 * 1024 * 1024 and not stream.read(1)
assert len(raw) == receipt['completeProfileBytes']
assert hashlib.sha256(raw).hexdigest() == receipt['profileSha256']
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
assert len(profile['samples']) == len(profile['timeDeltas'])
costs, negative = {}, []
for index, (selected, micros) in enumerate(zip(profile['samples'], profile['timeDeltas'])):
    assert selected in nodes and type(micros) is int
    if micros < 0:
        negative.append({'index': index, 'node': selected, 'micros': micros})
    at, visited, frames = selected, set(), set()
    while at is not None:
        assert at not in visited
        visited.add(at)
        frame = nodes[at]['callFrame']
        key = tuple(frame[name] for name in ['url', 'functionName', 'lineNumber', 'columnNumber'])
        cost = costs.setdefault(key, [0, 0])
        if at == selected:
            cost[0] += micros
        if key not in frames:
            cost[1] += micros
            frames.add(key)
        at = parents.get(at)
rows = [dict(zip(['url', 'functionName', 'lineNumber', 'columnNumber'], key),
             selfMicros=value[0], inclusiveMicros=value[1]) for key, value in costs.items()]
result = {'receipt': receipt, 'allFrames': rows, 'allNegativeDeltas': negative,
          'signedSampleMicros': sum(profile['timeDeltas']),
          'profileDurationMicros': profile['endTime'] - profile['startTime'],
          'scope': 'Complete signed samples; overlapping inclusive costs are not additive.',
          'diagnosticOnly': True, 'fullGatePassed': False, 'runtimeParity': False}
raw = json.dumps(result).encode()
with Path(str(base) + '-analysis.json.gz').open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
print(json.dumps({'topSelf': sorted(rows, key=lambda r: r['selfMicros'], reverse=True)[:20],
                  'topInclusive': sorted(rows, key=lambda r: r['inclusiveMicros'], reverse=True)[:25],
                  'signedSampleMicros': result['signedSampleMicros'],
                  'profileDurationMicros': result['profileDurationMicros']}))
