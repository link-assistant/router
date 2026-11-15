"""Retire two inactive task review copies after checking their published blobs."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

published = '37147a95ce5fb1efeced23b2ba49dcd036a53a8a'
base = Path('docs/case-studies/issue-784/evidence')
paths = [base / name for name in ['current-residual-published-complete-review.patch.gz',
                                'current-composed-published-review.patch.gz']]
receipt = base / 'published-review-copy-retirement.json'
assert not receipt.exists()
subprocess.run(['git', 'merge-base', '--is-ancestor', published, 'HEAD'], check=True)
rows = []
for path in paths:
    before = path.lstat()
    assert stat.S_ISREG(before.st_mode) and before.st_uid == os.getuid() and before.st_nlink == 1
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    with gzip.open(path, 'rb') as source:
        decoded = hashlib.file_digest(source, 'sha256').hexdigest()
    child = subprocess.Popen(['git', 'show', published + ':' + str(path)], stdout=subprocess.PIPE)
    try:
        remote = hashlib.file_digest(child.stdout, 'sha256').hexdigest()
    finally:
        child.stdout.close()
        status = child.wait()
    assert status == 0 and remote == digest
    rows.append(dict(path=str(path), bytes=before.st_size, sha256=digest,
                     decodedSha256=decoded, identity=list(before),
                     publishedUrl='https://github.com/link-assistant/router/blob/'
                                  + published + '/' + str(path)))
selected = {str(path.resolve()) for path in paths}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        links = list((process / 'fd').iterdir())
    except OSError:
        continue
    for link in links:
        try:
            active = os.readlink(link).removesuffix(' (deleted)')
        except OSError:
            continue
        assert active not in selected, 'Active task review copy'
for path, row in zip(paths, rows):
    assert list(path.lstat()) == row['identity']
record = dict(schema='published-task-review-copy-retirement-v1', published=published,
              members=rows, logicalBytesRetired=sum(row['bytes'] for row in rows),
              exactPublishedBlobsVerified=True, immutableHistoryPreserved=True,
              ciLogsRemoved=False)
receipt.write_text(json.dumps(record) + '\n')
assert json.loads(receipt.read_bytes()) == record
for path in paths:
    path.unlink()
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
