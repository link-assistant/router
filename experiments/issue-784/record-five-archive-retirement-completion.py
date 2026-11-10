"""Record post-unlink observations separately from the original pre-unlink receipts."""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('docs/case-studies/issue-784/evidence')
stems = ['core-hook-receiving-20261110', 'core-registration-receiving-20261110',
         'proof-history-receiving-20261110', 'namespace-receiving-20261110',
         'current-679-ci-terminal-ci']
script = Path('experiments/issue-784/retire-five-published-receiving-archives-20261110.py')
sha = lambda data: hashlib.sha256(data).hexdigest()
rows = []
for stem in stems:
    receipt = base / (stem + '-local-retirement.json.gz')
    raw = receipt.read_bytes()
    row = json.loads(gzip.decompress(raw))
    assert row['publishedCommit'] == 'e88183bb894b9ea62c9d6ae170c3fc099047685b'
    assert row['exactCompletePublishedGitStreamVerified']
    assert row['localArchiveRetired'] is False  # Deliberately preserved pre-unlink state.
    assert not Path(row['path']).exists() and not Path(row['path']).is_symlink()
    original_receipt = Path(row['originalReceipt'])
    assert sha(original_receipt.read_bytes()) == row['originalReceiptSha256']
    rows.append(dict(path=row['path'], bytes=row['bytes'], sha256=row['sha256'],
                     permanentUrl=row['permanentUrl'], gitBlob=row['gitBlob'],
                     preUnlinkReceipt=str(receipt), preUnlinkReceiptSha256=sha(raw),
                     postUnlinkPathAbsent=True,
                     logicalBytesReclaimed=row['logicalBytesReclaimed'],
                     allocatedBytesReclaimed=row['allocatedBytesReclaimed']))
log = Path('ci-logs/issue-784-restart-2/published-receiving-archive-retirement.log')
record = dict(schema='five-published-archive-retirement-completion-v1',
              publishedCommit='e88183bb894b9ea62c9d6ae170c3fc099047685b',
              executedScript=str(script), executedScriptSha256=sha(script.read_bytes()),
              completeExecutionLog=log.read_text(), completeExecutionLogSha256=sha(log.read_bytes()),
              originalPreUnlinkReceiptsUnchanged=True, postUnlinkObservations=rows,
              logicalBytesReclaimed=sum(row['logicalBytesReclaimed'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytesReclaimed'] for row in rows),
              completePublishedOriginalsRetained=True, fullGatePassed=False,
              runtimeParity=False, rustExecuted=False)
raw = json.dumps(record).encode()
target = base / 'five-published-archive-retirement-completion-20261110.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['logicalBytesReclaimed','allocatedBytesReclaimed']}))
