"""Retire one explicit inactive task duplicate, retaining its complete ZIP member."""
import hashlib
import json
import os
from pathlib import Path
import stat
import zipfile

root = Path.cwd()
original = root / 'ci-logs/restart-export-complete-artifact-13561756688/complete-HyIlVn/command.json'
archive = root / 'ci-logs/restart-export-complete-artifact-13561756688.zip'
receipt = root / 'ci-logs/issue-784-restart-2/current-profile-verified-zip-retirement.json'
assert not receipt.exists()
active = set()
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for fd in (process / 'fd').iterdir():
            try:
                active.add(os.readlink(fd))
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
assert str(original) not in active
before = original.lstat()
assert stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_uid == os.getuid()
assert before.st_size == 11514274
with original.open('rb') as source:
    original_hash = hashlib.file_digest(source, 'sha256').hexdigest()
with archive.open('rb') as source:
    archive_hash = hashlib.file_digest(source, 'sha256').hexdigest()
with zipfile.ZipFile(archive) as source:
    member = source.getinfo('complete-HyIlVn/command.json')
    assert member.file_size == before.st_size and member.CRC == 1636014287
    with source.open(member) as stream:
        digest, length = hashlib.sha256(), 0
        while block := stream.read(1024 * 1024):
            digest.update(block)
            length += len(block)
    assert length == before.st_size and digest.hexdigest() == original_hash
after = original.lstat()
assert (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns) == (
    before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns)
result = {'schema': 'single-explicit-inactive-zip-duplicate-retirement-v1',
          'original': str(original), 'originalBytes': before.st_size, 'originalSha256': original_hash,
          'archive': str(archive), 'archiveSha256': archive_hash, 'member': member.filename,
          'memberCrc': member.CRC, 'completeReadbackVerified': True,
          'allocatedBytesReclaimed': before.st_blocks * 512,
          'scope': 'This task inactive historical duplicate only; complete original retained inside verified ZIP.'}
with receipt.open('x') as output:
    json.dump(result, output)
original.unlink()
print(json.dumps(result))
