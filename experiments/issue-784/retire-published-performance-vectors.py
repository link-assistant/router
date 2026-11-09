"""Retire only inactive copies whose whole bytes remain in a published Git tree."""
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

assert sys.argv[1:] in ([], ['--write'])
write = sys.argv[1:] == ['--write']
root = Path.cwd().resolve()
head = '910e8dadfbf3f92490f2db19ed47c39d98af7077'
folder = Path('docs/case-studies/issue-784/evidence/receiving-performance-vectors')
remote_path = Path('ci-logs/issue-784-restart-2/current-published-910e8-git-commit.json')
remote = json.loads(remote_path.read_bytes())
assert remote['sha'] == head
tree = subprocess.check_output(['git', 'rev-parse', head + '^{tree}'], text=True).strip()
assert remote['tree']['sha'] == tree
names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', head, '--', str(folder)], text=True).splitlines()
assert names and set(names) == {str(path) for path in folder.rglob('*') if path.is_file()}
rows, states = [], {}
for name in names:
    path = Path(name)
    state = path.lstat()
    assert path.resolve() == root / path
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    blob = subprocess.check_output(['git', 'rev-parse', head + ':' + name], text=True).strip()
    process = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with process.stdout as source:
        retained_digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert process.wait() == 0 and retained_digest == digest
    states[path] = state
    rows.append(dict(path=name, bytes=state.st_size, sha256=digest, gitBlob=blob,
                     allocatedBytes=state.st_blocks * 512,
                     permanentUrl='https://github.com/link-assistant/router/blob/' + head + '/' + name + '?raw=true'))

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


record = dict(schema='published-performance-vector-copy-retirement-v1',
              publishedHead=head, publishedTree=tree, remoteCommit=remote,
              originalFiles=rows, completePublishedBlobsVerified=True,
              foreignUnreadableProcesses=inactive(), allOriginalStreamsRetained=True,
              logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              runtimeParity=False, fullGatePassed=False)
target = folder.with_name('receiving-performance-vectors-local-retirement.json.gz')
if write:
    raw = json.dumps(record, separators=(',', ':')).encode()
    with target.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(target.read_bytes()) == raw
    inactive()
    for path in states:
        path.unlink()
print(json.dumps(dict(write=write, files=len(rows), logicalBytesReclaimed=record['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=record['allocatedBytesReclaimed'], completePublishedBlobsVerified=True)))
