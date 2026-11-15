"""Retire only this task's inactive CI originals verified in published Git."""
import base64
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
head = '567e1dd0b072a2bfd736a9025ba245a630aaff7d'
folder = Path('docs/case-studies/issue-784/evidence/ci-4e9fad88')
metadata = json.loads(Path('ci-logs/issue-784-restart-2/current-published-4e9fad88-directory-metadata.json').read_bytes())
assert len(metadata) == 139
manifest = json.loads((folder / 'manifest.json').read_bytes())
assert manifest['publishedHead'] == '4e9fad88f28552f9e78da53084e4dcc50fdbe3c3'
assert manifest['nonpassingJobLogs'] == 23 and manifest['completeArtifacts'] == 25
originals = {row['retainedPath']: row for row in manifest['originals']}
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
    rows.append({'path': str(path), 'bytes': state.st_size, 'sha256': digest,
                 'gitBlob': blob, 'allocatedBytes': state.st_blocks * 512,
                 'permanentUrl': remote['html_url'] + '?raw=true'})


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
local_only = []
for path in sorted(folder.iterdir()):
    if path not in states:
        raw = path.read_bytes()
        assert len(raw) == originals[str(path)]['bytes']
        assert hashlib.sha256(raw).hexdigest() == originals[str(path)]['sha256']
        local_only.append({'path': str(path), 'bytes': len(raw),
                           'sha256': hashlib.sha256(raw).hexdigest(),
                           'base64': base64.b64encode(raw).decode()})
assert len(local_only) == 14
record = {'schema': 'published-complete-4e9-ci-local-retirement-v1',
          'publishedCommit': head, 'originalManifest': manifest,
          'remoteMetadata': metadata, 'publishedOriginals': rows,
          'localOnlyOriginalsRetainedWhole': local_only,
          'logicalBytesReclaimed': sum(row['bytes'] for row in rows),
          'allocatedBytesReclaimed': sum(row['allocatedBytes'] for row in rows),
          'completePublishedBlobsVerified': True,
          'allOriginalStreamsRetained': True, 'runtimeParity': False}
raw = json.dumps(record, separators=(',', ':')).encode()
target = folder.with_name('ci-4e9fad88-local-retirement.json.gz')
if write:
    with target.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(target.read_bytes()) == raw
    for row in json.loads(gzip.decompress(target.read_bytes()))['localOnlyOriginalsRetainedWhole']:
        decoded = base64.b64decode(row['base64'], validate=True)
        assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    inactive_and_unchanged()
    for path in states:
        path.unlink()
print(json.dumps({'write': write, 'verifiedPublishedFiles': len(rows),
                  'localOnlyWholeStreamsRetained': len(local_only),
                  'logicalBytesReclaimed': record['logicalBytesReclaimed'],
                  'allocatedBytesReclaimed': record['allocatedBytesReclaimed']}))
