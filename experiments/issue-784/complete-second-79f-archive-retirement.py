"""Confirm inactive published archive retirement and preserve immutable review links."""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('docs/case-studies/issue-784')
receipt = base / 'evidence/current-79f-second-published-archives-local-retirement.json.gz'
original = receipt.read_bytes()
record = json.loads(gzip.decompress(original))
assert record['publishedCommit'] == '79f375ed1d9690ab8336e06a28331c2871092eb0'
assert record['completePublishedBlobsVerified'] and record['publishedFilesVerified'] == 22
assert record['logicalBytesReclaimed'] == 74658329
assert all(not Path(row['path']).exists() for row in record['publishedOriginals'])
metadata = Path(record['remoteMetadata']).read_bytes()
assert hashlib.sha256(metadata).hexdigest() == record['remoteMetadataSha256']
tree = json.loads(gzip.decompress(metadata))
assert tree['sha'] == record['remoteDirectoryTree'] and not tree['truncated']
changed = []
for path in base.glob('*.md'):
    before = path.read_text()
    after = before
    for row in record['publishedOriginals']:
        local = str(Path(row['path']).relative_to(base))
        after = after.replace('](' + local + ')', '](' + row['permanentUrl'] + ')')
    if after != before:
        path.write_text(after)
        changed.append(str(path))
completion = dict(schema='complete-published-retirement-and-link-migration-v1',
                  receipt=str(receipt), receiptSha256=hashlib.sha256(original).hexdigest(),
                  remoteMetadata=tree, pathsAbsent=[row['path'] for row in record['publishedOriginals']],
                  allCompleteOriginalStreamsRetainedInPublishedGit=True,
                  logicalBytesReclaimed=record['logicalBytesReclaimed'],
                  allocatedBytesReclaimed=record['allocatedBytesReclaimed'],
                  updatedReports=changed, fullGatePassed=False, rustExecuted=False)
target = base / 'evidence/current-79f-second-published-archives-complete.json.gz'
raw = (json.dumps(completion, separators=(',', ':')) + '\n').encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(target=str(target), retired=22,
                      logicalBytesReclaimed=record['logicalBytesReclaimed'], updatedReports=changed)))
