"""Retire only the 25 inactive original ZIP copies already published in Git."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

assert sys.argv[1:] in [[], ['--write']]
write = sys.argv[1:] == ['--write']
head = '764222b6e6d4f0ce1efb0341396cfb6a87661e85'
folder = Path('docs/case-studies/issue-784/evidence/ci-17c7')
metadata_path = Path('ci-logs/issue-784-restart-2/current-published-17c7-directory-metadata.json')
metadata = json.loads(metadata_path.read_bytes())
manifest = json.loads((folder / 'manifest.json').read_bytes())
assert manifest['publishedHead'] == '17c7dd9942814f2a6a17eee135016e5941f04f15'
assert manifest['completeArtifacts'] == 25 and manifest['artifactCrcVerified']
originals = {row['retainedPath']: row for row in manifest['originals']}
selected = [row for row in metadata if row['type'] == 'file' and row['name'].endswith('.zip')]
assert len(selected) == 25
rows, states, paths = [], {}, set()
for remote in selected:
    path = Path(remote['path'])
    assert path.parent == folder and path.name.startswith('current-17c7-artifact-')
    state = path.lstat()
    assert state.st_uid == os.getuid() and state.st_nlink == 1 and stat.S_ISREG(state.st_mode)
    assert state.st_size == remote['size'] == originals[str(path)]['bytes']
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert digest == originals[str(path)]['sha256']
    blob = subprocess.check_output(['git', 'rev-parse', head + ':' + str(path)], text=True).strip()
    assert blob == remote['sha']
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        published_digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and published_digest == digest
    states[path] = state
    paths.add(str(path.resolve()))
    rows.append(dict(path=str(path), bytes=state.st_size, sha256=digest, gitBlob=blob,
                     allocatedBytes=state.st_blocks * 512,
                     permanentUrl='https://github.com/link-assistant/router/blob/' + head + '/' + str(path) + '?raw=true'))


def inactive_and_unchanged():
    for entry in Path('/proc').iterdir():
        if not entry.name.isdecimal():
            continue
        try:
            for fd in (entry / 'fd').iterdir():
                try:
                    assert os.readlink(fd) not in paths
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (entry / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in paths
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    for path, old in states.items():
        current = path.lstat()
        for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
            assert getattr(current, field) == getattr(old, field)


inactive_and_unchanged()
record = dict(schema='published-complete-17c7-artifact-local-retirement-v1',
              publishedCommit=head, originalManifest=manifest, remoteMetadata=metadata,
              publishedOriginals=rows, logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              completePublishedBlobsVerified=True, allOriginalStreamsRetained=True,
              fullGatePassed=False, runtimeParity=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = folder.with_name('ci-17c7-artifact-local-retirement.json.gz')
if write:
    with target.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(target.read_bytes()) == raw
    inactive_and_unchanged()
    for path in states:
        path.unlink()
print(json.dumps(dict(write=write, verifiedPublishedFiles=len(rows),
                      logicalBytesReclaimed=record['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=record['allocatedBytesReclaimed'])))
