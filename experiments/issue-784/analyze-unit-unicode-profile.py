"""Read one complete finite profile, then retain its verified gzip original."""
import gzip
import hashlib
import json
from collections import Counter
from pathlib import Path

path = Path('experiments/issue-784/current-unit-unicode-source.cpuprofile')
raw = path.read_bytes() if path.exists() else gzip.decompress(path.with_suffix(path.suffix + '.gz').read_bytes())
profile = json.loads(raw)
nodes = {row['id']: row for row in profile['nodes']}
parents = {child: row['id'] for row in nodes.values() for child in row.get('children', [])}
self_time = Counter()
inclusive = Counter()
aggregate_self = Counter()
aggregate_inclusive = Counter()
for node, delta in zip(profile['samples'], profile['timeDeltas']):
    self_time[node] += delta
    frame = nodes[node]['callFrame']
    aggregate_self[(frame['functionName'], frame['url'])] += delta
    visited = set()
    while node in nodes:
        inclusive[node] += delta
        frame = nodes[node]['callFrame']
        key = (frame['functionName'], frame['url'])
        if key not in visited:
            aggregate_inclusive[key] += delta
            visited.add(key)
        node = parents.get(node)

def rows(counts):
    return [{'seconds': us / 1e6, **nodes[node]['callFrame']}
            for node, us in counts.most_common(30)]

aggregated = lambda counts: [{'functionName': name, 'url': url, 'seconds': us / 1e6}
                            for (name, url), us in counts.most_common(40)]
print(json.dumps({'self': rows(self_time), 'inclusive': rows(inclusive),
                  'aggregateSelf': aggregated(aggregate_self),
                  'aggregateInclusive': aggregated(aggregate_inclusive)}, indent=2))
if not path.exists():
    raise SystemExit(0)
packed = path.with_suffix(path.suffix + '.gz')
with packed.open('xb') as output:
    with gzip.GzipFile(filename='', mode='wb', compresslevel=9, fileobj=output, mtime=0) as compressor:
        compressor.write(raw)
    if output.tell() > 1700000:
        raise RuntimeError('Profile compression exceeds remaining task evidence allowance')
expanded = gzip.decompress(packed.read_bytes())
if expanded != raw:
    raise RuntimeError('Complete compressed original differs')
receipt = {'originalPath': str(path), 'originalBytes': len(raw),
           'originalSha256': hashlib.sha256(raw).hexdigest(),
           'archivePath': str(packed), 'archiveBytes': packed.stat().st_size,
           'archiveSha256': hashlib.sha256(packed.read_bytes()).hexdigest(),
           'allDecodedOriginalsVerified': True}
path.with_suffix(path.suffix + '.receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
path.unlink()
print(json.dumps(receipt))
