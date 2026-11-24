"""Retire one inactive failed capture whose complete blob remains published."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

root = Path.cwd()
relative = 'docs/case-studies/issue-784/evidence/resolver-failed-partial.tar.xz'
path = root / relative
head = 'b63dd5a337c4e17f9df51f9ce866cb73fdea7662'
metadata = json.loads((root / 'ci-logs/issue-784-restart-2/failed-packet-published-custody.json').read_bytes())
original = json.loads(gzip.decompress(path.with_name('resolver-failed-partial.json.gz').read_bytes()))
assert metadata['path'] == relative and metadata['size'] == original['bytes'] == 24588813
state = path.lstat()
assert state.st_uid == os.getuid() and state.st_nlink == 1 and path.is_file() and not path.is_symlink()
with path.open('rb') as stream:
    digest = hashlib.file_digest(stream, 'sha256').hexdigest()
assert digest == original['sha256']
blob = subprocess.check_output(['git', 'rev-parse', head + ':' + relative], text=True).strip()
assert blob == metadata['sha']
process = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
with process.stdout as stream:
    preserved = hashlib.file_digest(stream, 'sha256').hexdigest()
assert process.wait() == 0 and preserved == digest
for process_path in Path('/proc').iterdir():
    if not process_path.name.isdecimal():
        continue
    try:
        for fd in (process_path / 'fd').iterdir():
            try:
                assert os.readlink(fd) != str(path)
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
after = path.lstat()
assert (state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns) == (
    after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
row = {'schema': 'published-failed-capture-retirement-v1', 'path': relative,
       'bytes': state.st_size, 'sha256': digest, 'publishedCommit': head, 'gitBlob': blob,
       'permanentUrl': metadata['html_url'] + '?raw=true',
       'completePublishedGitBlobVerified': True, 'completeOriginalFailedArtifactRetained': True,
       'logicalBytesReclaimed': state.st_size, 'allocatedBytesReclaimed': state.st_blocks * 512,
       'scope': 'One inactive incomplete capture only; the verified successful packet stays unchanged.'}
target = path.with_name('resolver-failed-partial-retirement.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(json.dumps(row).encode(), mtime=0))
assert json.loads(gzip.decompress(target.read_bytes())) == row
path.unlink()
print(json.dumps(row))
