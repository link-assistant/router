"""Inspect every retained-allocation and CPU sample of the finite proof probe."""
import collections
import argparse
import gzip
import hashlib
import json
from pathlib import Path

directory = Path(__file__).resolve().parents[2] / 'ci-logs/issue-784-restart-2'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--mode', choices=['proof-interval', 'resolver-interval'], default='proof-interval')
parser.add_argument('--variant', choices=['original', 'shared-project'], default='original')
args = parser.parse_args()
mode = args.mode
prefix = 'ordinary-' + ('' if args.variant == 'original' else 'shared-project-') + mode
source = directory / (prefix + '-profile.json.gz')
with gzip.open(source, 'rb') as stream:
    raw = stream.read(8 * 1024 * 1024 + 1)
if len(raw) > 8 * 1024 * 1024:
    raise RuntimeError('Finite complete profile bound')
record = json.loads(raw)
if (record['mode'] != mode or record.get('variant', 'original') != args.variant
        or not record['diagnosticOnly'] or not record.get('cpuProfile')):
    raise RuntimeError('Expected the complete diagnostic proof profile')
profile = record['cpuProfile']
nodes = {node['id']: node for node in profile['nodes']}
if len(nodes) != len(profile['nodes']) or len(nodes) > 100000:
    raise RuntimeError('Finite unique CPU profile nodes required')
parents, inclusive, own = {}, collections.Counter(), collections.Counter()
for node in nodes.values():
    for child in node.get('children', []):
        if child not in nodes or child in parents:
            raise RuntimeError('CPU profile is not a complete tree')
        parents[child] = node['id']
if len(profile['samples']) != len(profile['timeDeltas']):
    raise RuntimeError('Complete CPU sample deltas required')
for node_id, delta in zip(profile['samples'], profile['timeDeltas']):
    if node_id not in nodes or delta < 0:
        raise RuntimeError('CPU sample differs')
    own[node_id] += delta
    cursor, depth = node_id, 0
    while cursor is not None:
        inclusive[cursor] += delta
        cursor = parents.get(cursor)
        depth += 1
        if depth > 1024:
            raise RuntimeError('Finite CPU call-tree depth required')
cpu = [{'id': key, 'frame': node['callFrame'], 'selfMicroseconds': own[key],
        'inclusiveMicroseconds': inclusive[key]} for key, node in nodes.items()]
heap, pending = [], [(record['profile']['head'], [])]
while pending:
    node, ancestors = pending.pop()
    stack = [*ancestors, node['callFrame']]
    if len(stack) > 1024 or len(heap) > 100000:
        raise RuntimeError('Finite allocation call-tree bound')
    heap.append({'selfBytes': node.get('selfSize', 0), 'stack': stack})
    pending.extend((child, stack) for child in node.get('children', []))
result = {'sourceSha256': hashlib.sha256(raw).hexdigest(), 'completeSourceBytes': len(raw),
          'stage': record['stage'], 'checkpoints': record['checkpoints'],
          'elapsedMilliseconds': record['elapsedMilliseconds'], 'memory': record['memory'],
          'cpuSamples': len(profile['samples']), 'cpuSampleMicroseconds': sum(profile['timeDeltas']),
          'cpuNodes': cpu, 'heapNodes': heap, 'diagnosticOnly': True,
          'productionExecutableGain': 0, 'ordinaryPlannerCompleted': False}
encoded = json.dumps(result, separators=(',', ':')).encode()
target = directory / (prefix + '-inspection.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(encoded, mtime=0))
with gzip.open(target, 'rb') as stream:
    if stream.read() != encoded:
        raise RuntimeError('Complete inspection readback differs')
print(json.dumps({key: value for key, value in result.items() if key not in ['cpuNodes', 'heapNodes']}))
for row in sorted(cpu, key=lambda row: row['selfMicroseconds'], reverse=True)[:20]:
    print(json.dumps(row))
