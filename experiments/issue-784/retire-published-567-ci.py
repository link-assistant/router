"""Retire this task's inactive CI copies after verifying whole published blobs."""
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
folder = Path('docs/case-studies/issue-784/evidence/ci-567e1dd0')
metadata = json.loads(Path('ci-logs/issue-784-restart-2/current-published-567-directory-metadata.json').read_bytes())
manifest = json.loads((folder / 'manifest.json').read_bytes())
assert manifest['publishedHead'] == '567e1dd0b072a2bfd736a9025ba245a630aaff7d'
assert manifest['nonpassingJobResponses'] == 25
assert manifest['completeNonpassingJobLogs'] == 24
assert manifest['completeArtifacts'] == 24 and not manifest['completeLogCollection']
originals = {row['retainedPath']: row for row in manifest['originals']}
assert len(originals) == 162 and len(metadata) == 163
assert {row['path'] for row in metadata} == set(originals) | {str(folder / 'manifest.json')}
assert {str(path) for path in folder.iterdir()} == {row['path'] for row in metadata}
rows, states, paths = [], {}, set()
for remote in metadata:
    path = Path(remote['path'])
    assert path.parent == folder and remote['type'] == 'file'
    state = path.lstat()
    assert state.st_uid == os.getuid() and state.st_nlink == 1 and stat.S_ISREG(state.st_mode)
    assert state.st_size == remote['size']
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    if path.name != 'manifest.json':
        assert state.st_size == originals[str(path)]['bytes']
        assert digest == originals[str(path)]['sha256']
    blob = subprocess.check_output(['git', 'rev-parse', head + ':' + str(path)], text=True).strip()
    assert blob == remote['sha']
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        published_digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and published_digest == digest
    states[path] = state
    paths.add(str(path.resolve()))
    url = 'https://github.com/link-assistant/router/blob/' + head + '/' + str(path) + '?raw=true'
    rows.append(dict(path=str(path), bytes=state.st_size, sha256=digest,
                     gitBlob=blob, allocatedBytes=state.st_blocks * 512, permanentUrl=url))


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
        for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink',
                      'st_size', 'st_mtime_ns', 'st_ctime_ns']:
            assert getattr(current, field) == getattr(old, field)


inactive_and_unchanged()
record = dict(schema='published-complete-567-ci-local-retirement-v1',
              publishedCommit=head, originalManifest=manifest, remoteMetadata=metadata,
              publishedOriginals=rows, logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              completePublishedBlobsVerified=True, allOriginalStreamsRetained=True,
              completeLogCollection=False, runtimeParity=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = folder.with_name('ci-567e1dd0-local-retirement.json.gz')
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
