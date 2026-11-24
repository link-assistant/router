"""Retire one closed duplicate adapter replay after complete decoded comparison."""
import gzip
import hashlib
import json
import os
from pathlib import Path

base = Path('ci-logs/issue-784-checkpoint-b63dd5a33').resolve()
original = base / '42430143951.log.gz'
duplicate = base / 'available-workflow-log-adapter-replay.log.gz'
receipt = base / 'adapter-replay-duplicate-retirement.json'
assert not receipt.exists()
states = {str(path): path.lstat() for path in [original, duplicate]}
for path in [original, duplicate]:
    state = states[str(path)]
    assert path.is_file() and not path.is_symlink() and state.st_uid == os.getuid()
    assert state.st_nlink == 1
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for fd in (process / 'fd').iterdir():
            try:
                assert os.readlink(fd) not in states
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass

def fact(path):
    digest, length = hashlib.sha256(), 0
    with gzip.open(path, 'rb') as source:
        while block := source.read(65536):
            digest.update(block)
            length += len(block)
            assert length <= 64 * 1024 * 1024
    return {'decodedBytes': length, 'decodedSha256': digest.hexdigest()}

left, right = fact(original), fact(duplicate)
assert left == right
for path in [original, duplicate]:
    before, after = states[str(path)], path.lstat()
    assert (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) == (
        after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
row = {'retained': str(original), 'removed': str(duplicate), **left,
       'logicalBytesReclaimed': states[str(duplicate)].st_size,
       'allocatedBytesReclaimed': states[str(duplicate)].st_blocks * 512,
       'scope': 'One inactive task adapter replay; complete original bytes retained.'}
with receipt.open('x') as output:
    json.dump(row, output)
duplicate.unlink()
print(json.dumps(row))
