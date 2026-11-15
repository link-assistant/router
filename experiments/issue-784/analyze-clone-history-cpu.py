"""Summarize retained complete CPU samples without printing data-module source."""
import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('profile', type=Path)
args = parser.parse_args()
with gzip.open(args.profile, 'rb') as stream:
    raw = stream.read(64 * 1024 * 1024 + 1)
assert len(raw) <= 64 * 1024 * 1024
profile = json.loads(raw)
nodes = {row['id']: row for row in profile['nodes']}
self_time, modules, inclusive = Counter(), Counter(), Counter()
parents = {child: row['id'] for row in profile['nodes'] for child in row.get('children', [])}
for sample, elapsed in zip(profile['samples'], profile['timeDeltas'], strict=True):
    frame = nodes[sample]['callFrame']
    url = frame['url']
    if url.startswith('data:'):
        url = 'data:sha256:' + hashlib.sha256(url.encode()).hexdigest()
    key = (frame['functionName'], url, frame['lineNumber'] + 1)
    self_time[key] += elapsed
    modules[url] += elapsed
    current = sample
    for _depth in range(1024):
        inclusive[current] += elapsed
        current = parents.get(current)
        if current is None:
            break
    else:
        raise RuntimeError('CPU profile ancestry exceeds its finite bound')
def inclusive_row(node, elapsed):
    frame = nodes[node]['callFrame']
    url = frame['url']
    if url.startswith('data:'):
        url = 'data:sha256:' + hashlib.sha256(url.encode()).hexdigest()
    return dict(function=frame['functionName'], url=url,
                line=frame['lineNumber'] + 1, microseconds=elapsed)
print(json.dumps(dict(
    profile=str(args.profile), totalSampledMicroseconds=sum(profile['timeDeltas']),
    selfTime=[dict(function=key[0], url=key[1], line=key[2], microseconds=elapsed)
              for key, elapsed in self_time.most_common(50)],
    modules=[dict(url=url, microseconds=elapsed)
             for url, elapsed in modules.most_common(20)],
    inclusiveTime=[inclusive_row(node, elapsed)
                   for node, elapsed in inclusive.most_common(80)]), indent=2))
