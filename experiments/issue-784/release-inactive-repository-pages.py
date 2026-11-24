#!/usr/bin/env python3
"""Bounded file-cache diagnostic before checking this task's repository."""
import argparse
import gzip
import json
import os
from pathlib import Path
import stat
import subprocess

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--receipt', type=Path,
                    default=root / 'ci-logs/issue-784-restart-2/inactive-repository-pages.json')
parser.add_argument('--gzip-receipt', action='store_true')
parser.add_argument('--minimum-file-bytes', type=int, choices=[0, 131072], default=0,
                    help='Restrict page advice to the measured large-file cohort')
args = parser.parse_args()
receipt_path = args.receipt.resolve()
if receipt_path.parent != root / 'ci-logs/issue-784-restart-2':
    raise RuntimeError('Resource receipts must remain in this investigation directory')
if receipt_path.exists():
    raise RuntimeError('Refusing to overwrite an earlier observation')
if args.gzip_receipt and not receipt_path.name.endswith('.json.gz'):
    raise RuntimeError('Compressed receipts require an explicit .json.gz path')

def memory():
    fields = dict(line.split() for line in Path('/sys/fs/cgroup/memory.stat').read_text().splitlines())
    return {'total': int(Path('/sys/fs/cgroup/memory.current').read_text()),
            **{key: int(fields[key]) for key in ['anon', 'file', 'kernel']}}

# Never advise a file currently mapped or open by an observable process. This
# is only a page-cache hint; it cannot delete, truncate or change source data.
active, unreadable, zombies = set(), [], []
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        if any(line.startswith('State:\tZ') for line in process.joinpath('status').read_text().splitlines()):
            zombies.append(int(process.name))
            continue
        for line in process.joinpath('maps').read_text().splitlines():
            fields = line.split(None, 5)
            if len(fields) == 6 and fields[5].startswith(str(root) + '/'):
                active.add(fields[5])
        for descriptor in process.joinpath('fd').iterdir():
            try:
                active.add(os.readlink(descriptor))
            except (FileNotFoundError, ProcessLookupError):
                pass
    except PermissionError:
        if process.stat().st_uid == os.getuid():
            raise
        unreadable.append(int(process.name))
    except (FileNotFoundError, ProcessLookupError):
        pass
names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
if len(names) > 100000:
    raise RuntimeError('Tracked source selection exceeds diagnostic bound')
before, selected, skipped = memory(), [], []
for name in names:
    if not name:
        continue
    path = root / name
    try:
        state = path.lstat()
    except FileNotFoundError:
        # Tracked inactive observations can have a reviewed compressed successor.
        # No descriptor exists to advise for their removed working-tree path.
        skipped.append(name)
        continue
    if (not stat.S_ISREG(state.st_mode) or state.st_uid != os.getuid()
            or state.st_nlink != 1 or state.st_size < args.minimum_file_bytes
            or not path.resolve().is_relative_to(root)
            or str(path) in active):
        skipped.append(name)
        continue
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (opened.st_dev, opened.st_ino, opened.st_size) != (state.st_dev, state.st_ino, state.st_size):
            raise RuntimeError('Tracked file identity changed: ' + name)
        os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
        after = os.fstat(fd)
        if (opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise RuntimeError('Tracked file metadata changed: ' + name)
        selected.append({'path': name, 'bytes': opened.st_size})
    finally:
        os.close(fd)
receipt = {'before': before, 'after': memory(), 'files': selected,
           'minimumFileBytes': args.minimum_file_bytes,
           'skipped': skipped, 'foreignUnreadableProcesses': unreadable, 'zombies': zombies,
           'scope': 'POSIX_FADV_DONTNEED only on single-link regular tracked files inside this task worktree, excluding observed open/mapped paths. No file deleted, global cache drop, build tool, .git object, build cache or other worktree path. Cgroup differences are observations, not exact reclaimed disk or per-file cache accounting.'}
opener = gzip.open if args.gzip_receipt else open
with opener(receipt_path, 'xt') as output:
    json.dump(receipt, output)
    output.write('\n')
with opener(receipt_path, 'rt') as stream:
    if json.load(stream) != receipt:
        raise RuntimeError('Complete resource receipt readback differs')
print(json.dumps({key: value for key, value in receipt.items() if key not in ['files', 'skipped']}))
