"""Retain the complete finite producer-stage diagnostic without qualifying a test."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
paths = [Path('experiments/issue-784/trace-current-owned-matches.mjs'), Path(__file__)]
paths += [base / ('current-owned-matches-stage-diagnostic' + suffix)
          for suffix in ['.log', '.observer.log', '.memory.json']]
members = []
for path in paths:
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
receipt = json.loads(paths[-1].read_bytes())
assert receipt['exitCode'] == 0 and not receipt['stopped']
record = dict(schema='finite-owned-matches-stage-diagnostic-v1',
              completeStages=9, completeLayers=10, files=26,
              originalWholeTestExecuted=False, originalJsonCallSiteLocated=False,
              sourceSnapshotAtLaunchCaptured=False, pairedBenchmark=False,
              receivingPassed=False, runtimeParity=False, members=members)
raw = json.dumps(record, separators=(',', ':')).encode()
target = Path('docs/case-studies/issue-784/evidence/current-matches-stage-diagnostic.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
restored = json.loads(gzip.decompress(target.read_bytes()))
for row in restored['members']:
    value = base64.b64decode(row['base64'], validate=True)
    assert len(value) == row['bytes'] and hashlib.sha256(value).hexdigest() == row['sha256']
print(json.dumps(dict(packet=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True)))
