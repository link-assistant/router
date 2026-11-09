"""Inspect every complete collected job log and preserve numbered failure context.

This does not infer success from a partial CI cycle or treat intentional negative
test output as a failure. Full logs remain in the evidence packet.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prefix', required=True)
parser.add_argument('--collection', required=True, type=int)
parser.add_argument('--output', required=True)
args = parser.parse_args()
assert re.fullmatch('[a-z0-9-]{1,70}', args.prefix)
assert re.fullmatch(r'[a-z0-9-]{1,100}\.json\.gz', args.output)
base = Path('ci-logs/issue-784-restart-2')
collection_path = base / (args.prefix + '-collection-' + str(args.collection) + '.json.gz')
collection = json.loads(gzip.decompress(collection_path.read_bytes()))
records = []
for row in collection['records']:
    assert row['headSha'] == collection['headSha']
    source = Path(row['log'])
    assert source.parent == base
    raw_digest, size, lines, events, pending = hashlib.sha256(), 0, 0, [], []

    def inspect_chunk(chunk, first, pending):
        for at, text in enumerate(chunk, first):
            text = text.rstrip('\r\n')
            for event in pending:
                if at <= event['line'] + 18:
                    event['following'].append(dict(line=at, text=text[:500]))
            pending = [event for event in pending if at < event['line'] + 18]
            if re.search(r'\bnot ok \d+ - |##\[error\]|^FATAL ERROR:', text):
                assert len(events) < 10000
                event = dict(line=at, text=text[:500], following=[])
                events.append(event)
                if 'not ok ' in text:
                    pending.append(event)
        return pending

    with gzip.open(source, 'rb') as stream:
        # Process at most 1500 numbered lines per inspection chunk. No long
        # original source/log is printed wholesale or truncated on disk.
        chunk, first = [], 1
        for raw in stream:
            raw_digest.update(raw)
            size += len(raw)
            assert size <= 128 * 1024 * 1024
            chunk.append(raw.decode('utf8'))
            if len(chunk) < 1500:
                continue
            pending = inspect_chunk(chunk, first, pending)
            first += len(chunk)
            chunk = []
        pending = inspect_chunk(chunk, first, pending)
        lines = first - 1 + len(chunk)
    assert size == row['decodedBytes'] and raw_digest.hexdigest() == row['sha256']
    assert len(events) <= 10000
    records.append(dict(job=row['job'], log=row['log'], logSha256=row['sha256'],
                        logAvailable=row['validJobLog'], lines=lines,
                        everyDecodedLineInspected=True, events=events))
value = dict(schema='numbered-ci-failure-context-v1',
             headSha=collection['headSha'], runId=collection['run']['id'],
             cycleCompleted=collection['run']['status'] == 'completed',
             collection=str(collection_path), records=records,
             scope='Complete collected logs inspected in chunks of at most 1500 lines. '
                   'Displayed context is bounded; original full logs are retained. '
                   'Intentional negative test diagnostics are not counted as failures.',
             fullGatePassed=False, runtimeParity=False, rustExecuted=False)
target = base / args.output
raw = json.dumps(value, separators=(',', ':')).encode()
assert len(raw) <= 16 * 1024 * 1024
with target.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(target=str(target), jobs=len(records),
                      events=sum(len(row['events']) for row in records),
                      cycleCompleted=value['cycleCompleted'])))
