"""Read a complete bounded CPU packet and report weighted call-tree costs."""
from pathlib import Path
import collections
import json
import lzma

base = Path('ci-logs/issue-784-restart-2')
with lzma.open(base / 'reverse-build-complete-cpu-v3.json.xz', 'rb') as source:
    raw = source.read(32 * 1024 * 1024 + 1)
    assert len(raw) <= 32 * 1024 * 1024 and source.read(1) == b''
packet = json.loads(raw)
assert packet['completeOriginalProfileRejoinVerified'] is True
profile, strings = packet['profile'], packet['profileCallFrameStringTable']
nodes = {row['id']: row for row in profile['nodes']}
self_cost = collections.Counter()
for identity, delta in zip(profile['samples'], profile['timeDeltas'], strict=True):
    assert identity in nodes and delta >= 0
    self_cost[identity] += delta
inclusive = self_cost.copy()
for row in reversed(profile['nodes']):
    inclusive[row['id']] += sum(inclusive[child] for child in row.get('children', []))

def key(row):
    frame = row['callFrame']
    return (strings[frame['functionName']], strings[frame['url']], frame['lineNumber'])

by_self, by_inclusive = collections.Counter(), collections.Counter()
for identity, row in nodes.items():
    by_self[key(row)] += self_cost[identity]
    by_inclusive[key(row)] += inclusive[identity]
print(json.dumps(dict(milliseconds=packet['milliseconds'], nodes=len(nodes), samples=len(profile['samples']),
    diagnosticOnly=True, outputSha256=packet['outputSha256'])))
for label, costs in [('self', by_self), ('inclusive', by_inclusive)]:
    print(label)
    for (name, url, line), cost in costs.most_common(45):
        print(json.dumps(dict(milliseconds=cost / 1000, function=name[:180], url=url[:220], line=line + 1)))
