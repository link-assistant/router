"""Retain this task's whole canonical installation observations, then retire copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-canonical-installation.tar.gz')
receipt = target.with_name('current-canonical-installation.json.gz')
assert not target.exists() and not receipt.exists()
paths = sorted(set(base.glob('current-ec600-canonical-*')) |
    set(base.glob('current-ec600-independent-review-*')) |
    {base / 'withdrawn-project-effect-root-experiment.json.gz',
     Path('experiments/issue-784/measure-project-effect-roots.mjs')})
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
assert 20 <= len(paths) <= 64
roots = [Path(p) for p in ['ci-logs', 'docs/case-studies/issue-784',
                          'experiments/issue-784', 'js/node_modules/.node-case-deadlines']]
total = sum(p.stat().st_size for root in roots for p in root.rglob('*')
            if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
assert total + 1250000 < 500000000
selected = {str(p.resolve()) for p in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            if any(s.startswith('State:\tZ') for s in (process / 'status').read_text().splitlines()):
                continue
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd) not in selected
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except PermissionError:
            if process.stat().st_uid == os.getuid():
                raise
        except (FileNotFoundError, ProcessLookupError):
            pass


inactive()
members = []
for path in paths:
    state = path.lstat()
    assert str(path) not in tracked and stat.S_ISREG(state.st_mode)
    assert state.st_uid == os.getuid() and state.st_nlink == 1 and state.st_size <= 1000000
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
        identity=[state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]))
class BoundedOutput:
    def __init__(self, output):
        self.output = output
        self.bytes = 0

    def write(self, data):
        if self.bytes + len(data) > 1200000:
            raise ValueError('Reserved evidence output bound exceeded before writing')
        count = self.output.write(data)
        self.bytes += count
        return count

    def flush(self):
        self.output.flush()


with target.open('xb') as output:
    with gzip.GzipFile(fileobj=BoundedOutput(output), mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as archive:
            for path in paths:
                archive.add(path, arcname=str(path), recursive=False)
assert target.stat().st_size < 1200000
actual = []
with tarfile.open(target, 'r|gz') as archive:
    for member in archive:
        assert member.isfile() and member.size <= 1000000
        raw = archive.extractfile(member).read()
        actual.append(dict(path=member.name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
assert actual == [{k:r[k] for k in ['path', 'bytes', 'sha256']} for r in members]
inactive()
for row in members:
    path = Path(row['path'])
    state = path.lstat()
    assert row['identity'] == [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
record = dict(schema='complete-canonical-installation-observations-v1', archive=str(target),
    archiveBytes=target.stat().st_size, archiveSha256=hashlib.sha256(target.read_bytes()).hexdigest(),
    members=members, completeOriginalMemberReadbackVerified=True,
    retiredPhysicalCopies=True, withdrawnBenchmarkRetainedOnly=True,
    semanticAuthority=False, runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
for path in paths:
    path.unlink()
print(json.dumps(dict(archive=str(target), members=len(paths), originalBytes=sum(r['bytes'] for r in members),
    archiveBytes=record['archiveBytes'], reclaimedLogicalBytes=sum(r['bytes'] for r in members)-record['archiveBytes'])))
