"""Preserve every old task ZIP payload before retiring its inactive container.

Original archive SHA and CRC records remain, but original ZIP container bytes
are deliberately not retained. All complete original member bytes are retained.
"""
import argparse
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import stat
import tarfile
import zipfile

root = Path.cwd()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--batch', choices=['first', 'remaining'], required=True)
args = parser.parse_args()
paths = sorted([*Path('ci-logs/issue-784-checkpoint-b63dd5a33').glob('artifact-*.zip'),
                *Path('ci-logs/issue-784-restart-2').glob('receiving-batch-artifact-*.zip')])
if args.batch == 'first':
    assert len(paths) == 26 and sum(p.stat().st_size for p in paths) == 61_587_367
    paths = paths[:8]
else:
    assert len(paths) == 18
target = Path('docs/case-studies/issue-784/evidence/older-ci-complete-members-'
              + args.batch + '-20261110.tar.xz')
receipt = target.with_suffix('.receipt.json.gz')
assert not target.exists() and not receipt.exists()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns)


rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p), identity=identity(p)) for p in paths]
selected = {(r['identity'][0], r['identity'][1]) for r in rows}


def inactive():
    for proc in Path('/proc').iterdir():
        if not proc.name.isdecimal():
            continue
        try:
            fds = list((proc / 'fd').iterdir())
        except (FileNotFoundError, PermissionError):
            continue
        for fd in fds:
            try:
                s = fd.stat()
            except (FileNotFoundError, ProcessLookupError):
                continue
            assert (s.st_dev, s.st_ino) not in selected
    for p, r in zip(paths, rows):
        assert identity(p) == r['identity'] and digest(p) == r['sha256']


def allocation():
    return sum(p.stat().st_size for parent in ['ci-logs', 'docs/case-studies/issue-784',
               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
               for p in Path(parent).rglob('*') if p.is_file() and not p.is_symlink()
               and 'toolchain' not in p.parts)


inactive()
maximum = min(32 * 1024 * 1024, 499_000_000 - allocation())
assert maximum > 8_000_000


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, block):
        assert self.bytes + len(block) <= maximum
        size = self.stream.write(block)
        self.bytes += size
        return size

    def flush(self):
        self.stream.flush()


members, total = [], 0
with target.open('xb') as output:
    with lzma.LZMAFile(BoundedOutput(output), 'wb', preset=6) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as packed:
            for p, row in zip(paths, rows):
                with zipfile.ZipFile(p) as source:
                    entries = source.infolist()
                    assert len(entries) < 8192 and len(set(source.namelist())) == len(entries)
                    for entry in entries:
                        name = PurePosixPath(entry.filename)
                        assert not name.is_absolute() and '..' not in name.parts and '\\' not in entry.filename
                        assert not entry.is_dir() and not stat.S_ISLNK(entry.external_attr >> 16)
                        assert entry.file_size < 128 * 1024 * 1024
                        total += entry.file_size
                        assert total < 512 * 1024 * 1024
                        # Verify CRC and full SHA before independently reading
                        # the complete member again into the shared archive.
                        with source.open(entry) as stream:
                            sha = hashlib.file_digest(stream, 'sha256').hexdigest()
                        path = str(p) + '.members/' + entry.filename
                        member = tarfile.TarInfo(path)
                        member.size = entry.file_size
                        with source.open(entry) as stream:
                            packed.addfile(member, stream)
                        members.append(dict(path=path, originalContainer=str(p), originalMember=entry.filename,
                                            bytes=entry.file_size, sha256=sha, crc=entry.CRC))
                print(json.dumps(dict(container=str(p), completeMembers=len(entries))), flush=True)
by_path = {r['path']: r for r in members}
assert len(by_path) == len(members)
seen = set()
with tarfile.open(target, 'r|xz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
inactive()
record = dict(schema='complete-older-ci-member-custody-v1', archive=str(target),
              archiveBytes=target.stat().st_size, archiveSha256=digest(target),
              containers=rows, members=members, completeOriginalMemberBytesRetained=True,
              originalZipContainerBytesRetained=False, everyOriginalCrcVerified=True,
              retiredOnlyInactiveTaskContainers=True, logicalBytesReclaimed=sum(r['bytes'] for r in rows))
raw = json.dumps(record).encode()
with receipt.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw and allocation() < 500_000_000
inactive()
for p in paths:
    p.unlink()
print(json.dumps(dict(archive=str(target), bytes=target.stat().st_size,
                      sha256=digest(target), completeMembers=len(members), evidenceBytes=allocation(),
                      completeOriginalMemberBytesRetained=True,
                      originalZipContainerBytesRetained=False)))
