"""Retire this task's inactive CI copies after verifying whole published blobs."""
import gzip
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
head = '1c235248e1b584875c3ec2b9c1bd2d94a859943c'
folder = Path('docs/case-studies/issue-784/evidence/ci-764222b6')
metadata = json.loads(Path('ci-logs/issue-784-restart-2/current-published-764-directory-metadata.json').read_bytes())
manifest = json.loads((folder / 'manifest.json').read_bytes())
assert manifest['publishedHead'] == '764222b6e6d4f0ce1efb0341396cfb6a87661e85'
assert manifest['nonpassingJobResponses'] == 24
assert manifest['completeNonpassingJobLogs'] == 23
assert manifest['completeArtifacts'] == 24 and not manifest['completeLogCollection']
originals = {row['retainedPath']: row for row in manifest['originals']}
assert len(originals) == 179 and len(metadata) == 180
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
record = dict(schema='published-complete-764-ci-local-retirement-v1',
              publishedCommit=head, foreignUnreadableProcesses=foreign_unreadable, originalManifest=manifest, remoteMetadata=metadata,
              publishedOriginals=rows, logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              completePublishedBlobsVerified=True, allOriginalStreamsRetained=True,
              completeLogCollection=False, runtimeParity=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = folder.with_name('ci-764222b6-local-retirement.json.gz')
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
