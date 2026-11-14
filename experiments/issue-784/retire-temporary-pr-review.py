"""Retire this task's inactive old review diff; preserve every CI failure log."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

path = Path('ci-logs/issue-784-restart-2/current-custody-reviewed-whole-pr.diff.gz')
receipt = path.with_name('current-custody-reviewed-whole-pr-retired.json')
assert not receipt.exists()
state = path.lstat()
assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
with path.open('rb') as source:
    compressed_hash = hashlib.file_digest(source, 'sha256').hexdigest()
decoded_hash, decoded_bytes = hashlib.sha256(), 0
with gzip.open(path, 'rb') as source:
    while block := source.read(65536):
        decoded_hash.update(block)
        decoded_bytes += len(block)
assert decoded_bytes == 52940989
assert decoded_hash.hexdigest() == 'c9e2ad3647203926d9e5a05a92220db8cbd8ebfb1c1dc2b27f80f5c0aad016fa'
source_commit = 'f86824ea2eff18895db3ea809373457ebeb66a83'
subprocess.run(['git', 'merge-base', '--is-ancestor', source_commit, 'HEAD'], check=True)
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        links = list((process / 'fd').iterdir())
    except OSError:
        continue
    for link in links:
        try:
            target = os.readlink(link).removesuffix(' (deleted)')
        except OSError:
            continue
        assert target != str(path.resolve()), 'Active task review diff'
current = path.lstat()
for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
    assert getattr(current, field) == getattr(state, field)
record = dict(schema='temporary-task-pr-review-retirement-v1', path=str(path),
              compressedBytes=state.st_size, compressedSha256=compressed_hash,
              decodedBytes=decoded_bytes, decodedSha256=decoded_hash.hexdigest(),
              publishedAncestor=source_commit, historyPreserved=True,
              exactReviewDiffStillRetained=False, ciLogsRemoved=False,
              reason='Inactive task review intermediate retired for the evidence cap; '
                     'earlier full-readback receipt is historical, not current byte custody.')
receipt.write_text(json.dumps(record) + '\n')
assert json.loads(receipt.read_bytes()) == record
path.unlink()
print(json.dumps(record))
