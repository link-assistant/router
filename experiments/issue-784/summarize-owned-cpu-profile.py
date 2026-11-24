#!/usr/bin/env python3
"""Summarize a retained bounded CPU profile without exposing compiler sources."""
import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('profile', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
packed = args.profile.read_bytes()
if len(packed) > 8 * 1024 * 1024:
    raise ValueError('Retained finite profile exceeds its compressed-byte bound')
with gzip.open(args.profile, 'rb') as source:
    raw = source.read(8 * 1024 * 1024 + 1)
if len(raw) > 8 * 1024 * 1024:
    raise ValueError('Retained finite profile exceeds its original-byte bound')
profile = json.loads(raw)
nodes = {row['id']: row for row in profile['nodes']}
parents = {}
for node in nodes.values():
    for child in node.get('children', []):
        if child in parents:
            raise ValueError('CPU profile contains multiple parents')
        parents[child] = node['id']
samples, deltas = profile['samples'], profile['timeDeltas']
if len(samples) != len(deltas):
    raise ValueError('CPU profile sample times differ')
self_time, inclusive = Counter(), Counter()
for sample, delta in zip(samples, deltas):
    if sample not in nodes or not isinstance(delta, int) or delta < 0:
        raise ValueError('CPU profile contains an invalid sample')
    self_time[sample] += delta
    active, seen = sample, set()
    while active is not None:
        if active in seen:
            raise ValueError('CPU profile contains a parent cycle')
        seen.add(active)
        inclusive[active] += delta
        active = parents.get(active)


def rows(counter):
    result = []
    for node_id, microseconds in counter.most_common(20):
        frame = nodes[node_id]['callFrame']
        result.append({'function': frame['functionName'],
                       'url': frame['url'],
                       'line': frame['lineNumber'] + 1,
                       'microseconds': microseconds})
    return result


result = {'schema': 'bounded-owned-cpu-profile-summary-v1',
          'profile': str(args.profile),
          'packedSha256': hashlib.sha256(packed).hexdigest(),
          'samples': len(samples), 'sampleMicroseconds': sum(deltas),
          'self': rows(self_time), 'inclusive': rows(inclusive),
          'inclusiveTimesOverlap': True, 'includesProfilerOverhead': True,
          'performanceQualification': False, 'newExecutableFunctions': 0}
with args.output.open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
assert json.loads(args.output.read_text()) == result
print(json.dumps({key: result[key] for key in
                  ('samples', 'sampleMicroseconds', 'packedSha256',
                   'performanceQualification', 'newExecutableFunctions')}))
