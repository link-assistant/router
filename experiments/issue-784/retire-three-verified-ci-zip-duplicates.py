"""Retire three explicit inactive extracted originals after full ZIP readback."""
import hashlib
import json
import os
from pathlib import Path
import stat
import zipfile

root = Path.cwd()
base = root / 'ci-logs'
receipt = base / 'issue-784-restart-2/receiving-batch-old-zip-duplicate-retirement.json'
assert not receipt.exists()
choices = [
    ('13560346605', 'complete-GaWIBh/stdout.raw.tap', 2098380),
    ('13561756688', 'complete-HyIlVn/stdout.raw.tap', 1373036),
    ('13560498078', '.node-case-deadlines/complete-LikO5m/command.json', 948765),
]
selected = []
for identity, member, expected in choices:
    prefix = base / ('restart-export-complete-artifact-' + identity)
    selected.append((prefix / member, prefix.with_suffix('.zip'), member, expected))


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    target = os.readlink(fd)
                except (FileNotFoundError, ProcessLookupError):
                    continue
                assert target not in {str(row[0]) for row in selected}
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            continue


def digest(stream):
    value, length = hashlib.sha256(), 0
    while block := stream.read(65536):
        value.update(block)
        length += len(block)
    return length, value.hexdigest()


def identity(state):
    return (state.st_dev, state.st_ino, state.st_mode, state.st_uid,
            state.st_nlink, state.st_size, state.st_mtime_ns, state.st_ctime_ns)


inactive()
rows = []
for original, archive, member_name, expected in selected:
    state = original.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_nlink == 1
    assert state.st_uid == os.getuid() and state.st_size == expected
    assert not archive.is_symlink() and archive.is_file()
    with original.open('rb') as source:
        original_digest = digest(source)
    with archive.open('rb') as source:
        archive_digest = digest(source)
    with zipfile.ZipFile(archive) as source:
        member = source.getinfo(member_name)
        assert member.file_size == expected
        with source.open(member) as stream:
            assert digest(stream) == original_digest
    assert identity(original.lstat()) == identity(state)
    rows.append({'original': str(original), 'originalBytes': expected,
                 'originalSha256': original_digest[1], 'archive': str(archive),
                 'archiveBytes': archive_digest[0], 'archiveSha256': archive_digest[1],
                 'member': member_name, 'crc': member.CRC,
                 'allocatedBytesReclaimed': state.st_blocks * 512,
                 'identity': identity(state),
                 'completeReadbackVerified': True})
inactive()
with receipt.open('x') as output:
    json.dump({'schema': 'three-explicit-inactive-ci-duplicate-retirement-v1',
               'rows': rows, 'completeOriginalsRetained': True,
               'scope': 'Only these historical extracted duplicates; full originals remain in verified ZIPs.'}, output)
for original, _, _, _ in selected:
    row = next(row for row in rows if row['original'] == str(original))
    with original.open('rb') as source:
        assert digest(source)[1] == row['originalSha256']
    assert identity(original.lstat()) == row['identity']
    original.unlink()
print(json.dumps({'files': len(rows), 'logicalBytesReclaimed': sum(row['originalBytes'] for row in rows),
                  'allocatedBytesReclaimed': sum(row['allocatedBytesReclaimed'] for row in rows)}))
