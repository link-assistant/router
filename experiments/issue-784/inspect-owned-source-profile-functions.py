"""Attribute an existing finite source diagnostic without running it again."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
source = base / 'current-owned-base64-profile-valid-input-cpu.json.gz'
with gzip.open(source, 'rb') as stream:
    raw = stream.read(8 * 1024 * 1024 + 1)
assert len(raw) <= 8 * 1024 * 1024
profile = json.loads(raw)
nodes = {row['id']: row for row in profile['nodes']}
parents = {}
for row in nodes.values():
    for child in row.get('children', []):
        assert child in nodes and child not in parents
        parents[child] = row['id']
assert len(profile['samples']) == len(profile['timeDeltas']) <= 500000
frames = {}


def key(identity):
    frame = nodes[identity]['callFrame']
    value = (frame['url'], frame['functionName'], frame['lineNumber'],
             frame['columnNumber'])
    frames[value] = frame
    return value


self_times, inclusive, nearest = Counter(), Counter(), Counter()
for identity, micros in zip(profile['samples'], profile['timeDeltas']):
    assert isinstance(micros, int) and micros >= 0
    self_times[key(identity)] += micros
    seen, functions, caller = set(), set(), None
    while identity is not None:
        assert identity not in seen
        seen.add(identity)
        function = key(identity)
        if function not in functions:
            inclusive[function] += micros
            functions.add(function)
        if caller is None and '/tools/translation/' in function[0]:
            caller = function
        identity = parents.get(identity)
    if caller is not None:
        nearest[caller] += micros


def rows(values):
    return [dict(sampledMicroseconds=micros, callFrame=frames[function])
            for function, micros in values.most_common()]


result = dict(schema='finite-owned-source-profile-function-attribution-v1',
              source=str(source), rawSha256=hashlib.sha256(raw).hexdigest(),
              samples=len(profile['samples']),
              sampledMicroseconds=sum(profile['timeDeltas']),
              selfFunctions=rows(self_times), inclusiveFunctions=rows(inclusive),
              nearestProjectFunction=rows(nearest),
              recursiveFunctionsCountedOncePerSample=True,
              includesProfilerOverhead=True, performanceQualified=False,
              newExecutableFunctions=0)
payload = json.dumps(result, separators=(',', ':')).encode()
output = base / 'current-owned-base64-function-attribution.json.gz'
with output.open('xb') as stream:
    stream.write(gzip.compress(payload, mtime=0))
assert gzip.decompress(output.read_bytes()) == payload
for section in ['selfFunctions', 'nearestProjectFunction', 'inclusiveFunctions']:
    print(section)
    for row in result[section][:20]:
        frame = row['callFrame']
        print(row['sampledMicroseconds'], frame['functionName'], frame['url'],
              frame['lineNumber'] + 1)
