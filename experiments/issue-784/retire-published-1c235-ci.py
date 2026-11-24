"""Retire this task's inactive CI copies after verifying whole published blobs."""
import gzip
import base64
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

assert sys.argv[1:] in [[], ['--write']]
write = sys.argv[1:] == ['--write']
head = '910e8dadfbf3f92490f2db19ed47c39d98af7077'
folder = Path('docs/case-studies/issue-784/evidence/ci-1c235248')
metadata = json.loads(Path('ci-logs/issue-784-restart-2/current-published-1c235-directory-metadata.json').read_bytes())
manifest = json.loads((folder / 'manifest.json').read_bytes())
assert manifest['publishedHead'] == '1c235248e1b584875c3ec2b9c1bd2d94a859943c'
assert manifest['nonpassingJobResponses'] == 24
assert manifest['completeNonpassingJobLogs'] == 23
assert manifest['completeArtifacts'] == 24 and not manifest['completeLogCollection']
originals = {row['retainedPath']: row for row in manifest['originals']}
assert len(originals) == 156 and len(metadata) == 142
remote_paths = {row['path'] for row in metadata}
all_paths = set(originals) | {str(folder / 'manifest.json')}
assert remote_paths <= all_paths
assert {str(path) for path in folder.iterdir()} == all_paths
# The repository ignores *.log. All 23 gzip job streams and original artifacts
# are published, but 15 small collection transcripts need complete embedded
# custody before any local retirement. Do not invent a published URL for them.
unpublished = sorted(all_paths - remote_paths)
assert len(unpublished) == 15 and all(name.endswith('.log') for name in unpublished)
local_members = []
for name in unpublished:
    path = Path(name)
    raw = path.read_bytes()
    assert len(raw) == originals[name]['bytes']
    assert hashlib.sha256(raw).hexdigest() == originals[name]['sha256']
    local_members.append(dict(path=name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                              base64=base64.b64encode(raw).decode()))
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


spec = importlib.util.spec_from_file_location('completed_pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
foreign_unreadable = []


def inactive_and_unchanged():
    active, unreadable = pages.active_paths(Path.cwd().resolve())
    assert not paths.intersection(active), 'Published copies remain in use'
    foreign_unreadable[:] = unreadable
    for path, old in states.items():
        current = path.lstat()
        for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink',
                      'st_size', 'st_mtime_ns', 'st_ctime_ns']:
            assert getattr(current, field) == getattr(old, field)


inactive_and_unchanged()
record = dict(schema='published-complete-1c235-ci-local-retirement-v1',
              publishedCommit=head, foreignUnreadableProcesses=foreign_unreadable, originalManifest=manifest, remoteMetadata=metadata,
              publishedOriginals=rows, logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              completePublishedBlobsVerified=True, publishedFilesVerified=len(rows),
              embeddedUnpublishedCollectionLogs=local_members, allOriginalStreamsRetained=True,
              completeLogCollection=False, runtimeParity=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = folder.with_name('ci-1c235248-local-retirement.json.gz')
if write:
    with target.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(target.read_bytes()) == raw
    for member in json.loads(gzip.decompress(target.read_bytes()))['embeddedUnpublishedCollectionLogs']:
        decoded = base64.b64decode(member['base64'], validate=True)
        assert len(decoded) == member['bytes'] and hashlib.sha256(decoded).hexdigest() == member['sha256']
    inactive_and_unchanged()
    for path in states:
        path.unlink()
print(json.dumps(dict(write=write, verifiedPublishedFiles=len(rows),
                      logicalBytesReclaimed=record['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=record['allocatedBytesReclaimed'])))
