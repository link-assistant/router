"""Retire only verified inactive copies of the preceding complete CI cycle."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

published = '82bff66b3eaec603e296f1d888fe909dad4743c8'
base = Path('docs/case-studies/issue-784/evidence/ci-939')
manifest_path = base / 'manifest.json.gz'
manifest = json.loads(gzip.decompress(manifest_path.read_bytes()))
metadata_path = Path('ci-logs/issue-784-restart-2/next-82b-published-evidence-metadata.json')
metadata = {row['path']: row for row in json.loads(metadata_path.read_bytes())}
selected = [dict(path=str(base / row['storedAs']), bytes=row['bytes'], sha256=row['sha256'])
            for row in manifest['members'] if row['storedAs'].endswith(('.zip', '.log.gz'))]
assert len(selected) == 63 and sum(row['bytes'] for row in selected) == 101094950
assert manifest['entireCycleTerminal'] and manifest['completeArtifacts'] == 26
assert subprocess.check_output(['git', 'ls-remote', 'origin', 'refs/heads/issue-784-1f6838f56841'], text=True).split()[0] == published
receipt = Path('docs/case-studies/issue-784/evidence/ci-939-published-local-retirement.json.gz')
completion = receipt.with_name('ci-939-published-local-retirement-complete.json.gz')
assert not receipt.exists() and not completion.exists()


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    return [getattr(info, key) for key in ['st_dev', 'st_ino', 'st_mode', 'st_uid',
            'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']]


def inactive(rows):
    paths = {str(Path(row['path']).resolve()) for row in rows}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
            maps = (process / 'maps').read_text(errors='replace')
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in paths
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
        for line in maps.splitlines():
            parts = line.split(None, 5)
            assert len(parts) < 6 or parts[5].removesuffix(' (deleted)') not in paths


def write(path, record):
    raw = json.dumps(record, separators=(',', ':')).encode()
    with path.open('xb') as target:
        target.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(path.read_bytes()) == raw


rows = []
for row in selected:
    path = Path(row['path'])
    assert path.parent == base and path.name.startswith('checkpoint939-')
    before = identity(path)
    assert path.stat().st_size == row['bytes'] and digest(path) == row['sha256']
    remote = metadata[row['path']]
    assert remote['type'] == 'file' and remote['size'] == row['bytes']
    blob = subprocess.check_output(['git', 'rev-parse', published + ':' + row['path']], text=True).strip()
    assert blob == remote['sha']
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as stream:
        remote_digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    assert child.wait() == 0 and remote_digest == row['sha256']
    assert identity(path) == before
    rows.append(dict(row, identity=before, gitBlob=blob,
                     allocatedBytes=path.stat().st_blocks * 512,
                     permanentUrl='https://github.com/link-assistant/router/blob/' + published + '/' + row['path'] + '?raw=true',
                     completePublishedStreamVerified=True))
inactive(rows)
record = dict(schema='complete-939-published-ci-local-retirement-v1',
              publishedCommit=published, originalManifest=str(manifest_path),
              originalManifestSha256=digest(manifest_path), metadata=json.loads(metadata_path.read_bytes()),
              rows=rows, logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              allOriginalStreamsRetainedInPublishedGit=True, onlyInactiveTaskCopies=True,
              runtimeParity=False, fullGatePassed=False)
write(receipt, record)
inactive(rows)
for row in rows:
    path = Path(row['path'])
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    path.unlink()
assert all(not Path(row['path']).exists() for row in rows)
write(completion, dict(schema=record['schema'], receipt=str(receipt), receiptSha256=digest(receipt),
                       retired=len(rows), logicalBytesReclaimed=record['logicalBytesReclaimed'],
                       allocatedBytesReclaimed=record['allocatedBytesReclaimed']))
print(json.dumps(dict(retired=len(rows), logicalBytesReclaimed=record['logicalBytesReclaimed'],
                     allocatedBytesReclaimed=record['allocatedBytesReclaimed'], receipt=str(receipt))))
