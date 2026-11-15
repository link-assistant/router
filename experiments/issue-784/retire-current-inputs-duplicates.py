"""Retire inactive working copies after complete committed packet readbacks."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

root = Path.cwd()
commit = 'de310d1ee7602d5663bc347a2a28bece21f3c58f'
base = Path('docs/case-studies/issue-784/evidence')
packet = base / 'current-inputs-and-live-reads-20261110.tar.gz'
index = base / 'current-inputs-and-live-reads-20261110.json.gz'
receipt = base / 'current-inputs-duplicate-retirement.json.gz'
completion = base / 'current-inputs-duplicate-retirement-complete.json.gz'
assert not receipt.exists() and not completion.exists()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(value):
    return [value.st_dev, value.st_ino, value.st_mode, value.st_uid,
            value.st_nlink, value.st_size, value.st_mtime_ns, value.st_ctime_ns]


for path in [packet, index]:
    child = subprocess.Popen(['git', 'show', commit + ':' + str(path)],
                             stdout=subprocess.PIPE)
    with child.stdout as source:
        committed = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and committed == digest(path)
record = json.loads(gzip.decompress(index.read_bytes()))
assert record['sha256'] == digest(packet)
assert record['bytes'] == packet.stat().st_size
selected = []
with tarfile.open(packet, 'r|gz') as archive:
    for row, member in zip(record['members'], archive, strict=True):
        assert member.isfile() and member.name == row['path']
        assert member.size == row['bytes']
        with archive.extractfile(member) as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
        path = Path(row['path'])
        if not str(path).startswith(('ci-logs/issue-784-restart-2/',
                                     'js/node_modules/.node-case-deadlines/')):
            continue
        assert path.resolve() == root / path
        state = path.lstat()
        assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid()
        assert state.st_nlink == 1 and state.st_size == row['bytes']
        assert digest(path) == row['sha256']
        if path.name == 'terminal.json':
            terminal = json.loads(path.read_bytes())
            assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        selected.append(dict(row, identity=identity(state),
                             allocatedBytes=state.st_blocks * 512))
assert 1 <= len(selected) <= 128


def inactive():
    paths = {str(root / row['path']) for row in selected}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd) not in paths
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in paths
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


def write(path, value):
    raw = json.dumps(value).encode()
    with path.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(path.read_bytes()) == raw


inactive()
before = dict(schema='complete-current-inputs-duplicate-retirement-v1',
              commit=commit, archive=str(packet), archiveSha256=digest(packet),
              allArchiveMembersReadBack=True, rows=selected,
              logicalBytes=sum(row['bytes'] for row in selected),
              allocatedBytes=sum(row['allocatedBytes'] for row in selected),
              originalSourcesRetained=True, originalPacketRetained=True)
write(receipt, before)
inactive()
assert digest(packet) == record['sha256']
for row in selected:
    path = Path(row['path'])
    assert identity(path.lstat()) == row['identity']
    assert digest(path) == row['sha256']
    path.unlink()
assert all(not Path(row['path']).exists() for row in selected)
done = dict(schema=before['schema'], preUnlinkReceipt=str(receipt),
            preUnlinkReceiptSha256=digest(receipt), retired=len(selected),
            logicalBytesReclaimed=before['logicalBytes'],
            allocatedBytesReclaimed=before['allocatedBytes'],
            originalSourcesRetained=True, originalPacketRetained=True)
write(completion, done)
print(json.dumps(done))
