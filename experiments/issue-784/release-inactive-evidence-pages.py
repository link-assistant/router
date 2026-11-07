#!/usr/bin/env python3
"""Release cached pages of this task's inactive evidence, preserving every file."""
import json
import os
from pathlib import Path
import stat
import time

root = Path(__file__).resolve().parents[2]
receipt_path = root / 'ci-logs/issue-784-restart-2/inactive-evidence-pages.json'
if receipt_path.exists():
    raise RuntimeError('Refusing to overwrite an earlier resource observation')
selected = [root / 'ci-logs/issue-784-restart-2',
            root / 'docs/case-studies/issue-784/evidence']
archive = root / 'experiments/issue-784/toolchain/node-v20.20.2-linux-x64.tar.xz'
def memory():
    fields = dict(line.split() for line in Path('/sys/fs/cgroup/memory.stat').read_text().splitlines())
    return {'total': int(Path('/sys/fs/cgroup/memory.current').read_text()),
            **{name: int(fields[name]) for name in ['anon', 'file', 'kernel', 'inactive_file', 'active_file']}}
paths = []
for directory in selected:
    if not directory.is_dir() or directory.is_symlink():
        raise RuntimeError('Expected ordinary task evidence directory')
    paths.extend(path for path in directory.rglob('*') if path.is_file())
if archive.is_file():
    paths.append(archive)
before, rows = memory(), []
for path in sorted(paths):
    state = path.lstat()
    if not stat.S_ISREG(state.st_mode) or state.st_uid != os.getuid():
        raise RuntimeError('Expected ordinary task-owned evidence file: ' + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (opened.st_dev, opened.st_ino, opened.st_size) != (state.st_dev, state.st_ino, state.st_size):
            raise RuntimeError('Evidence identity changed')
        os.fsync(fd)
        os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
        after = os.fstat(fd)
        if (opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise RuntimeError('Evidence metadata changed')
        rows.append({'path': str(path.relative_to(root)), 'bytes': state.st_size})
    finally:
        os.close(fd)
time.sleep(1)
receipt = {'before': before, 'after': memory(), 'files': rows,
           'selectedLogicalBytes': sum(row['bytes'] for row in rows),
           'scope': 'POSIX_FADV_DONTNEED on only identified inactive task evidence and its authenticated Node archive; no file removed, no global cache drop, no Rust or other worker build directory touched. Total cgroup differences are observations, not exact per-file page accounting.'}
with receipt_path.open('x') as target:
    json.dump(receipt, target)
    target.write('\n')
print(json.dumps({key: value for key, value in receipt.items() if key != 'files'}))
