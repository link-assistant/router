"""Inspect a complete bounded regeneration profile without selecting samples."""
import argparse
import collections
from datetime import datetime
import gzip
import hashlib
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('label')
parser.add_argument('--attached', action='store_true',
                    help='Read this task finite already-running canonical CPU observation')
args = parser.parse_args()
assert re.fullmatch(r'[a-z0-9-]{1,70}', args.label)
base = Path('ci-logs/issue-784-restart-2')
prefix = base / args.label
limit = 64 * 1024 * 1024


def complete(suffix):
    with gzip.open(str(prefix) + suffix, 'rb') as source:
        raw = source.read(limit + 1)
        assert len(raw) <= limit and not source.read(1)
        return raw


if args.attached:
    record = json.loads(Path(str(prefix) + '.receipt.json').read_text())
    assert record['schema'] == 'owned-canonical-cpu-observation-v1'
    assert record['compilerInputsChanged'] is False
    assert record['performanceQualification'] is False
    raw = complete('.cpuprofile.json.gz')
    assert len(raw) == record['rawBytes'] <= 8388608
    record['elapsedMs'] = 1000 * (datetime.fromisoformat(record['finishedAt'])
                                 - datetime.fromisoformat(record['startedAt'])).total_seconds()
else:
    record = json.loads(complete('-result.json.gz'))
    raw = complete('-cpu.json.gz')
    assert len(raw) == record['cpu']['bytes']
    assert hashlib.sha256(raw).hexdigest() == record['cpu']['sha256']
profile = json.loads(raw)
nodes = {row['id']: row for row in profile['nodes']}
assert len(nodes) == len(profile['nodes']) <= 100000
parents = {}
for row in nodes.values():
    for child in row.get('children', []):
        assert child in nodes and child not in parents
        parents[child] = row['id']
assert len(profile['samples']) == len(profile['timeDeltas']) <= 1000000
own, inclusive = collections.Counter(), collections.Counter()
for identity, delta in zip(profile['samples'], profile['timeDeltas']):
    assert identity in nodes and delta >= 0
    own[identity] += delta
    cursor, seen = identity, set()
    while cursor is not None:
        assert cursor not in seen and len(seen) <= 4096
        seen.add(cursor)
        inclusive[cursor] += delta
        cursor = parents.get(cursor)


def rows(counter):
    result = []
    for identity, microseconds in counter.most_common(40):
        frame = nodes[identity]['callFrame']
        result.append(dict(milliseconds=microseconds / 1000,
                           function=frame['functionName'], url=frame['url'],
                           line=frame['lineNumber'] + 1))
    return result


result = dict(label=args.label, elapsedMs=record['elapsedMs'],
              warmup=record.get('warmup'), samples=len(profile['samples']),
              self=rows(own), inclusive=rows(inclusive),
              diagnosticOnly=True, deadlineQualified=False)
target = Path(str(prefix) + '-analysis.json')
with target.open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
print(json.dumps(dict(target=str(target), samples=result['samples'],
                      elapsedMs=result['elapsedMs'])))
