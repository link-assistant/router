"""Compress this task's inactive, untracked earlier snapshots without losing bytes."""
import gzip
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cohort', choices=['ec600', '37147'], default='ec600')
args = parser.parse_args()
stem = 'current-' + args.cohort + '-earlier-snapshots'
target = Path('docs/case-studies/issue-784/evidence') / (stem + '.tar.gz')
receipt = target.with_name(stem + '.json.gz')
assert not target.exists() and not receipt.exists()
pattern = re.compile(r'current-ec600-(ci-snapshot|completed-logs|jobs|artifacts|run-list)-[2-8]\.json' if args.cohort == 'ec600'
    else r'current-37147a-(completed-logs|job-snapshot)-([1-9]|1[0-4])\.json')
paths = sorted(p for p in base.iterdir() if pattern.fullmatch(p.name))
assert 2 <= len(paths) <= 48
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
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
    assert state.st_uid == os.getuid() and state.st_nlink == 1 and state.st_size <= 8388608
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
        identity=[state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]))
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as archive:
            for path in paths:
                archive.add(path, arcname=str(path), recursive=False)
assert target.stat().st_size < 350000
actual = []
with tarfile.open(target, 'r|gz') as archive:
    for member in archive:
        assert member.isfile() and member.size <= 8388608
        raw = archive.extractfile(member).read()
        actual.append(dict(path=member.name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
assert actual == [{k:r[k] for k in ['path', 'bytes', 'sha256']} for r in members]
inactive()
for row in members:
    path = Path(row['path'])
    state = path.lstat()
    assert row['identity'] == [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
record = dict(schema='complete-inactive-ci-snapshot-archive-v1', archive=str(target),
    archiveBytes=target.stat().st_size, archiveSha256=hashlib.sha256(target.read_bytes()).hexdigest(),
    members=members, completeOriginalMemberReadbackVerified=True,
    retiredPhysicalCopies=True, semanticAuthority=False, runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
for path in paths:
    path.unlink()
print(json.dumps(dict(archive=str(target), members=len(paths), originalBytes=sum(r['bytes'] for r in members),
    archiveBytes=record['archiveBytes'], reclaimedLogicalBytes=sum(r['bytes'] for r in members)-record['archiveBytes'])))
