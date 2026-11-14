#!/usr/bin/env python3
"""Keep the complete completed archive-failure log in lossless gzip custody."""
import gzip
import hashlib
import json
import os
from pathlib import Path

source = Path('ci-logs/issue-784-restart-2/runtime-common-withdrawal-archive.log')
receipt = source.with_suffix('.compression.json')
target = source.with_suffix('.log.gz')
before = source.lstat()
assert source.is_file() and not source.is_symlink() and before.st_size <= 4194304
data = source.read_bytes()
packed = gzip.compress(data, compresslevel=9, mtime=0)
assert gzip.decompress(packed) == data
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == data
holders = []
for process in Path('/proc').iterdir():
    if not process.name.isdecimal() or int(process.name) == os.getpid():
        continue
    try:
        for descriptor in (process / 'fd').iterdir():
            try:
                state = descriptor.stat()
                if (state.st_dev, state.st_ino) == (before.st_dev, before.st_ino):
                    holders.append(str(descriptor))
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
        for line in (process / 'maps').read_text().splitlines():
            fields = line.split(maxsplit=5)
            if len(fields) >= 5 and fields[4] == str(before.st_ino):
                major, minor = fields[3].split(':')
                if os.makedev(int(major, 16), int(minor, 16)) == before.st_dev:
                    holders.append(str(process / 'maps'))
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
assert not holders, holders
after = source.lstat()
assert (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) == (
    after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
assert source.read_bytes() == data
record = dict(schema='complete-runtime-common-archive-failure-compression-v1',
              source=str(source), compressed=str(target), originalBytes=len(data),
              compressedBytes=len(packed), sha256=hashlib.sha256(data).hexdigest(),
              packedSha256=hashlib.sha256(packed).hexdigest(),
              completeReadbackVerified=True, inactiveFileVerified=True,
              originalAllocatedBytes=before.st_blocks * 512,
              reclaimedLogicalBytes=len(data) - len(packed))
with receipt.open('x') as output:
    json.dump(record, output)
    output.write('\n')
source.unlink()
print(json.dumps(record))
