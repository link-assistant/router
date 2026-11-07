#!/usr/bin/env python3
"""Bounded file-cache diagnostic before checking this task's repository."""
import json
import os
from pathlib import Path
import stat
import subprocess

root = Path(__file__).resolve().parents[2]
receipt_path = root / 'ci-logs/issue-784-restart-2/inactive-repository-pages.json'
if receipt_path.exists():
    raise RuntimeError('Refusing to overwrite an earlier observation')

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
    state = path.lstat()
    if (not stat.S_ISREG(state.st_mode) or state.st_uid != os.getuid()
            or state.st_nlink != 1 or not path.resolve().is_relative_to(root)
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
           'skipped': skipped, 'foreignUnreadableProcesses': unreadable, 'zombies': zombies,
           'scope': 'POSIX_FADV_DONTNEED only on single-link regular tracked files inside this task worktree, excluding observed open/mapped paths. No file deleted, global cache drop, build tool, .git object, build cache or other worktree path. Cgroup differences are observations, not exact reclaimed disk or per-file cache accounting.'}
with receipt_path.open('x') as output:
    json.dump(receipt, output)
    output.write('\n')
print(json.dumps({key: value for key, value in receipt.items() if key not in ['files', 'skipped']}))
