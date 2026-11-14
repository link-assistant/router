"""Manual page advice for this task's closed immutable Git object files only."""
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
assert Path.cwd().resolve() == root
assert len(sys.argv) == 2
receipt = Path(sys.argv[1])
assert receipt.resolve().parent == root / 'ci-logs/issue-784-restart-2'
assert not receipt.exists()
common = subprocess.check_output(['git', 'rev-parse', '--git-common-dir'], text=True).strip()
assert (root / common).resolve() == root / '.git'
folder = root / '.git/objects/pack'
assert folder.is_dir() and not folder.is_symlink()
spec = importlib.util.spec_from_file_location('completed_pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
active, unreadable = pages.active_paths(root)
identity = lambda state: tuple(getattr(state, field) for field in [
    'st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns'])
before = int(Path('/sys/fs/cgroup/memory.current').read_text())
selected, skipped = [], []
names = sorted(folder.iterdir())
assert len(names) <= 128
for directory in sorted((root / '.git/objects').iterdir()):
    if not re.fullmatch(r'[0-9a-f]{2}', directory.name):
        continue
    state = directory.lstat()
    assert stat.S_ISDIR(state.st_mode) and state.st_uid == os.getuid()
    for path in directory.iterdir():
        assert re.fullmatch(r'[0-9a-f]{38}', path.name)
        if path.lstat().st_size >= 131072:
            names.append(path)
assert len(names) <= 4096
for path in names:
    if path.parent == folder and not re.fullmatch(r'pack-[0-9a-f]{40}\.(pack|idx|rev)', path.name):
        skipped.append(str(path.relative_to(root)))
        continue
    state = path.lstat()
    if (not stat.S_ISREG(state.st_mode) or state.st_uid != os.getuid()
            or state.st_nlink != 1 or str(path) in active):
        skipped.append(str(path.relative_to(root)))
        continue
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        assert identity(os.fstat(descriptor)) == identity(state)
        os.posix_fadvise(descriptor, 0, 0, os.POSIX_FADV_DONTNEED)
        assert identity(os.fstat(descriptor)) == identity(state) == identity(path.lstat())
    finally:
        os.close(descriptor)
    selected.append({'path': str(path.relative_to(root)), 'bytes': state.st_size,
                     'identityUnchanged': True})
record = {'beforeCgroupBytes': before,
          'afterCgroupBytes': int(Path('/sys/fs/cgroup/memory.current').read_text()),
          'selected': selected, 'skipped': skipped, 'foreignUnreadableProcesses': unreadable,
          'scope': 'POSIX_FADV_DONTNEED only for closed, owned, single-link regular pack/idx/rev files and complete-name loose objects of at least 128 KiB in this worktree Git directory. No deletion, content mutation, other worktree, global cache action or test-clock pause.',
          'semanticQualification': False}
with receipt.open('x') as output:
    json.dump(record, output)
assert json.loads(receipt.read_bytes()) == record
print(json.dumps(record))
