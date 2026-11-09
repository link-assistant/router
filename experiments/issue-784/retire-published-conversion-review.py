"""Retire one inactive task review after verifying its whole published blob."""
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess

head = '1c235248e1b584875c3ec2b9c1bd2d94a859943c'
path = Path('docs/case-studies/issue-784/evidence/current-conversion-local-pr-diff.patch.gz')
state = path.lstat()
assert state.st_uid == os.getuid() and state.st_nlink == 1 and stat.S_ISREG(state.st_mode)
with path.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
blob = subprocess.check_output(['git', 'rev-parse', head + ':' + str(path)], text=True).strip()
child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
with child.stdout as source:
    published_digest = hashlib.file_digest(source, 'sha256').hexdigest()
assert child.wait() == 0 and published_digest == digest
with gzip.open(path, 'rb') as source:
    raw_digest = hashlib.file_digest(source, 'sha256').hexdigest()
spec = importlib.util.spec_from_file_location('completed_pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


def unchanged_and_inactive():
    active, unreadable = pages.active_paths(Path.cwd().resolve())
    assert str(path.resolve()) not in active
    current = path.lstat()
    for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink',
                  'st_size', 'st_mtime_ns', 'st_ctime_ns']:
        assert getattr(current, field) == getattr(state, field)
    return unreadable


record = dict(schema='published-complete-conversion-review-retirement-v1',
              publishedCommit=head, path=str(path), bytes=state.st_size, sha256=digest,
              decodedSha256=raw_digest, gitBlob=blob,
              permanentUrl='https://github.com/link-assistant/router/blob/' + head + '/' + str(path) + '?raw=true',
              allocatedBytesReclaimed=state.st_blocks * 512,
              foreignUnreadableProcesses=unchanged_and_inactive(),
              wholePublishedBlobVerified=True, completeOriginalRetained=True,
              sourceOrTestRemoved=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = path.with_name('current-conversion-review-local-retirement.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
unchanged_and_inactive()
path.unlink()
print(json.dumps(record))
