"""Retain complete inactive deadline outputs before removing their raw copies."""
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import tarfile

root = Path.cwd().resolve()
folder = Path('js/node_modules/.node-case-deadlines')
target = Path('docs/case-studies/issue-784/evidence/completed-deadline-files-20261109_0235.tar.gz')
receipt = target.with_name(target.name + '.json')
states, rows = {}, []
for path in sorted(folder.rglob('*')):
    state = path.lstat()
    assert not stat.S_ISLNK(state.st_mode)
    if stat.S_ISDIR(state.st_mode):
        continue
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    states[path] = state
    rows.append(dict(path=str(path), bytes=state.st_size, sha256=digest,
                     allocatedBytes=state.st_blocks * 512))
assert 700 <= len(rows) <= 1000
spec = importlib.util.spec_from_file_location('pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


def inactive():
    active, unreadable = pages.active_paths(root)
    assert not {str((root / path).resolve()) for path in states}.intersection(active)
    for path, old in states.items():
        current = path.lstat()
        for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
            assert getattr(current, field) == getattr(old, field)
    return unreadable


unreadable = inactive()
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), folder]
before = sum(p.stat().st_size for base in roots for p in base.rglob('*')
             if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
assert before < 498_000_000
try:
    with target.open('xb') as output:
        with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode='w|') as archive:
                for row in rows:
                    path = Path(row['path'])
                    archive.add(path, arcname=str(path), recursive=False)
                    assert output.tell() + before < 499_500_000
    by_path = {row['path']: row for row in rows}
    seen = set()
    with tarfile.open(target, mode='r|gz') as archive:
        for member in archive:
            assert member.isfile() and member.name in by_path and member.name not in seen
            row = by_path[member.name]
            with archive.extractfile(member) as source:
                assert member.size == row['bytes']
                assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
            seen.add(member.name)
    assert seen == set(by_path)
except BaseException:
    target.unlink(missing_ok=True)
    raise
with target.open('rb') as source:
    archive_hash = hashlib.file_digest(source, 'sha256').hexdigest()
record = dict(schema='complete-inactive-deadline-output-retention-v1',
              archive=str(target), archiveBytes=target.stat().st_size,
              archiveSha256=archive_hash, members=rows,
              allCompleteOriginalBytesReadBack=True,
              foreignUnreadableProcesses=unreadable,
              logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
assert before + target.stat().st_size + len(raw) < 500_000_000
with receipt.open('xb') as output:
    output.write(raw)
assert receipt.read_bytes() == raw
inactive()
for path in states:
    path.unlink()
for path in sorted(folder.rglob('*'), key=lambda path: len(path.parts), reverse=True):
    assert path.is_dir()
    path.rmdir()
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
