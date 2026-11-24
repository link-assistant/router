"""Sampling attribution only; retain the full profile separately."""
import collections
import gzip
import hashlib
import json
import lzma
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlparse

base = Path('ci-logs/issue-784-restart-2')
profile_path = base / 'core-source-current-profile.json.xz'
raw = lzma.decompress(profile_path.read_bytes())
record = json.loads(raw)
profile = record['profile']
nodes = {row['id']: row for row in profile['nodes']}
parents = {child: row['id'] for row in nodes.values() for child in row.get('children', [])}
assert len(profile['samples']) == len(profile['timeDeltas']) <= 500000
self_times, inclusive = collections.Counter(), collections.Counter()
function_self, function_inclusive = collections.Counter(), collections.Counter()
frames = {}


def function_key(identity):
    frame = nodes[identity]['callFrame']
    key = (frame['url'], frame['functionName'], frame['lineNumber'], frame['columnNumber'],
           frame['scriptId'] if not frame['url'] else '')
    frames[key] = frame
    return key


for identity, micros in zip(profile['samples'], profile['timeDeltas']):
    self_times[identity] += micros
    function_self[function_key(identity)] += micros
    seen, seen_functions = set(), set()
    while identity is not None:
        assert identity not in seen
        seen.add(identity)
        inclusive[identity] += micros
        key = function_key(identity)
        if key not in seen_functions:
            function_inclusive[key] += micros
            seen_functions.add(key)
        identity = parents.get(identity)


def ranked(times):
    return [dict(nodeId=identity, sampledMicroseconds=micros,
                 callFrame=nodes[identity]['callFrame']) for identity, micros in times.most_common(40)]


def ranked_functions(times):
    return [dict(sampledMicroseconds=micros, callFrame=frames[key])
            for key, micros in times.most_common(40)]


sources = {}
root = Path.cwd()
for row in ranked(self_times) + ranked(inclusive) + ranked_functions(function_self) + ranked_functions(function_inclusive):
    parsed = urlparse(row['callFrame']['url'])
    if parsed.scheme != 'file':
        continue
    path = Path(unquote(parsed.path))
    if not path.is_relative_to(root / 'tools/translation') or not path.is_file():
        continue
    relative = str(path.relative_to(root))
    if relative in sources:
        continue
    source = path.read_bytes()
    assert len(source) < 1024 * 1024
    original = subprocess.check_output(['git', 'show', 'HEAD:' + relative])
    assert original == source
    sources[relative] = dict(source=source.decode(), sha256=hashlib.sha256(source).hexdigest())
result = dict(schema='complete-Core-source-producer-sampling-attribution-v1',
              completeInspectorSource=Path(__file__).read_text(),
              sourceCommit=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              completeProfileRawSha256=hashlib.sha256(raw).hexdigest(),
              samples=len(profile['samples']), intervalMicroseconds=1000,
              sampledMicroseconds=sum(profile['timeDeltas']),
              selfFrames=ranked(self_times), inclusiveFrames=ranked(inclusive),
              selfFunctions=ranked_functions(function_self),
              inclusiveFunctions=ranked_functions(function_inclusive),
              recursionCountedOncePerFunctionPerSample=True,
              completePhysicalProjectSources=sources,
              sourceAuthority=False, deadlineQualified=False, performanceGainProved=False,
              productionExecutableGain=0, rustExecuted=False)
output = base / 'core-source-current-function-attribution.json.gz'
payload = json.dumps(result, separators=(',', ':')).encode()
with output.open('xb') as stream:
    stream.write(gzip.compress(payload, mtime=0))
assert gzip.decompress(output.read_bytes()) == payload
print(json.dumps(dict(output=str(output), samples=result['samples'],
                      sampledMicroseconds=result['sampledMicroseconds'], projectSources=len(sources))))
for row in result['selfFunctions'][:20]:
    frame = row['callFrame']
    print(row['sampledMicroseconds'], frame['functionName'], frame['url'], frame['lineNumber'] + 1)
