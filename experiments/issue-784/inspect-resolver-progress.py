"""Inspect every complete diagnostic line without expanding its stream to disk."""
import collections
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
path = base / 'ordinary-resolver-progress-512.output.log.gz'
counts, active, spans, slow = collections.Counter(), {}, [], []
non_events, tail = [], []
digest, size, previous = hashlib.sha256(), 0, None
with gzip.open(path, 'rb') as source:
    for number, raw in enumerate(source, 1):
        digest.update(raw)
        size += len(raw)
        line = raw.decode().rstrip('\n')
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            non_events.append({'line': number, 'text': line})
            continue
        if not isinstance(row, dict) or 'schema' not in row:
            non_events.append({'line': number, 'value': row})
            continue
        schema = row['schema']
        if schema == 'actual-resolver-consumption-diagnostic-v1':
            stage = row['stage']
            counts[stage] += 1
            if stage == 'resolver-item-start':
                if previous is not None:
                    slow.append({'durationMs': row['milliseconds'] - previous['milliseconds'],
                                 'start': previous, 'next': row})
                previous = row
                tail = (tail + [row])[-10:]
            else:
                previous = None
        elif schema == 'actual-derive-invocation-diagnostic-v1':
            key = (row['source'], row['span']['start'], row['span']['end'])
            counts['derive-' + row['state']] += 1
            if row['state'] == 'start':
                if key in active:
                    raise RuntimeError('Repeated live derive invocation')
                active[key] = row
            elif row['state'] == 'end':
                start = active.pop(key)
                spans.append({'start': start, 'end': row,
                              'durationMs': row['milliseconds'] - start['milliseconds']})
            else:
                raise RuntimeError('Unknown derive diagnostic state')
        else:
            non_events.append({'line': number, 'value': row})
if active or len(spans) != 419 or counts['carrier-module-start'] != 397 or counts['carrier-module-end'] != 397:
    raise RuntimeError('Complete production derive/carrier execution differs')
receipt = json.loads((base / 'ordinary-resolver-progress-512.memory.json').read_text())
if receipt['exitCode'] != 134 or receipt['stopped'] or receipt['interrupted']:
    raise RuntimeError('Expected original finite diagnostic heap failure')
result = {'lines': number, 'logicalBytes': size, 'sha256': digest.hexdigest(),
          'counts': dict(counts), 'completeDeriveInvocations': spans,
          'lastItems': tail, 'slowestItemIntervals': sorted(slow, key=lambda row: row['durationMs'], reverse=True)[:20],
          'allNonEventLines': non_events, 'receipt': receipt,
          'diagnosticOnly': True, 'runtimeParity': False, 'plannerOutputInstalled': False}
target = base / 'ordinary-resolver-progress-inspection.json.gz'
encoded = json.dumps(result, separators=(',', ':')).encode()
with target.open('xb') as destination:
    destination.write(gzip.compress(encoded, mtime=0))
if gzip.decompress(target.read_bytes()) != encoded:
    raise RuntimeError('Complete inspection readback differs')
print(json.dumps({key: result[key] for key in ['lines', 'logicalBytes', 'sha256', 'counts']}))
print(json.dumps({'lastItem': tail[-1], 'slowestItemIntervals': result['slowestItemIntervals'][:5]}))
for row in non_events:
    print(json.dumps(row))
