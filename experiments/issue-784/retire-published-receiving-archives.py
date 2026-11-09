"""Retire four exact, inactive, immutable published receiving archive copies."""
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

assert sys.argv[1:] in [[], ['--write']]
write = sys.argv[1:] == ['--write']
head = '74f62c037a21e4b3e4e3804dcf3d941d0aabfe19'
folder = Path('docs/case-studies/issue-784/evidence')
names = ['phased-clone-complete.tar.xz', 'export-repair-complete.tar.xz',
         'matrix-draft-complete.tar.xz', 'runtime-freeze-complete.tar.xz']
tree = subprocess.check_output(['git', 'rev-parse', head + ':' + str(folder)], text=True).strip()
metadata_path = Path('ci-logs/issue-784-restart-2/current-published-receiving-archive-tree.json.gz')
if not metadata_path.exists():
    raw = subprocess.check_output(['gh', 'api', 'repos/link-assistant/router/git/trees/' + tree])
    with metadata_path.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
metadata = json.loads(gzip.decompress(metadata_path.read_bytes()))
assert metadata['sha'] == tree and metadata['truncated'] is False
remote = {row['path']: row for row in metadata['tree']}
rows, states = [], {}
for name in names:
    path, row = folder / name, remote[name]
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    assert row['type'] == 'blob' and state.st_size == row['size']
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    blob = subprocess.check_output(['git', 'rev-parse', head + ':' + str(path)], text=True).strip()
    assert blob == row['sha']
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        published_digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and published_digest == digest
    states[path] = state
    rows.append(dict(path=str(path), bytes=state.st_size, sha256=digest, gitBlob=blob,
        allocatedBytes=state.st_blocks * 512,
        permanentUrl='https://github.com/link-assistant/router/blob/' + head + '/' + str(path) + '?raw=true'))
spec = importlib.util.spec_from_file_location('pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


def inactive_and_unchanged():
    active, unreadable = pages.active_paths(Path.cwd().resolve())
    assert not {str(path.resolve()) for path in states}.intersection(active)
    for path, before in states.items():
        current = path.lstat()
        for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
            assert getattr(current, field) == getattr(before, field)
    return unreadable


record = dict(schema='published-receiving-archive-local-retirement-v1', publishedCommit=head,
    remoteDirectoryTree=tree, remoteMetadata=str(metadata_path),
    remoteMetadataSha256=hashlib.sha256(metadata_path.read_bytes()).hexdigest(),
    foreignUnreadableProcesses=inactive_and_unchanged(), publishedOriginals=rows,
    completePublishedBlobsVerified=True, publishedFilesVerified=len(rows),
    logicalBytesReclaimed=sum(row['bytes'] for row in rows),
    allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
    runtimeParity=False, fullGatePassed=False)
if write:
    target = folder / 'published-receiving-archive-local-retirement.json.gz'
    raw = json.dumps(record, separators=(',', ':')).encode()
    with target.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(target.read_bytes()) == raw
    inactive_and_unchanged()
    for path in states:
        path.unlink()
print(json.dumps(dict(write=write, verifiedPublishedFiles=len(rows),
    logicalBytesReclaimed=record['logicalBytesReclaimed'],
    allocatedBytesReclaimed=record['allocatedBytesReclaimed'])))
