"""Retain every canonical stale/missing path from the complete failed CI log."""
import gzip
import json
from pathlib import Path
import re

base = Path('ci-logs/issue-784-restart-2')
path = base / 'current-74f62-early-job-128977139179.log.gz'
records = []
with gzip.open(path, 'rt') as source:
    for number, line in enumerate(source, 1):
        match = re.match(r'^\S+ (stale|missing): (.+)\n?$', line)
        if match:
            records.append(dict(line=number, kind=match[1], path=match[2].rstrip('\r\n')))
assert len({row['path'] for row in records}) == len(records) == 325
record = dict(schema='complete-canonical-freshness-failure-index-v1',
    headSha='74f62c037a21e4b3e4e3804dcf3d941d0aabfe19',
    mergeSha='1ceb354f3e6cf8c3ead0388b76eaaada5cc90e99',
    jobId=128977139179, sourceLog=str(path), records=records,
    counts={kind: sum(row['kind'] == kind for row in records) for kind in ['stale', 'missing']},
    currentWorkingTreeFreshnessProved=False, fullGatePassed=False)
target = base / 'current-74f62-canonical-freshness-index.json.gz'
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(output=str(target), counts=record['counts'])))
