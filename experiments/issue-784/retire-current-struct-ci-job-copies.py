"""Retire inactive completed-CI job duplicates after complete preserved-packet readback."""
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import tarfile

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
receipt = root / 'docs/case-studies/issue-784/evidence/struct-ordering-source-and-ci-20261111.json.gz'
record = json.loads(gzip.decompress(receipt.read_bytes()))
assert record['allDecodedOriginalsVerified'] and record['allSelectedOriginalsUnchanged']
archive = Path(record['archive'])


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


assert archive.stat().st_size == record['archiveBytes']
assert digest(archive) == record['archiveSha256']
names = [Path(row['originalPath']).name for row in record['members']
         if Path(row['originalPath']).parent == base
         and Path(row['originalPath']).name.startswith('bedaterminal-job-')
         and Path(row['originalPath']).is_file()]
assert len(names) == 92 and len(set(names)) == len(names)
selected = {row['path']: row for row in record['members']
            if Path(row['originalPath']).parent == base
            and Path(row['originalPath']).name in names}
assert len(selected) == len(names)
assert sum(row['bytes'] for row in selected.values()) == 1219450
for row in selected.values():
    path = Path(row['originalPath'])
    assert path.is_file() and not path.is_symlink() and path.stat().st_uid == os.getuid()
    assert path.stat().st_size == row['bytes'] and digest(path) == row['sha256']
verified, contents = set(), {}
with tarfile.open(archive, 'r|xz') as source:
    for member in source:
        actual = None
        if member.isfile():
            with source.extractfile(member) as stream:
                actual = (member.size, hashlib.file_digest(stream, 'sha256').hexdigest())
        elif member.islnk():
            actual = contents[member.linkname]
        if actual is not None:
            contents[member.name] = actual
        if member.name in selected:
            row = selected[member.name]
            assert member.name not in verified and actual == (row['bytes'], row['sha256'])
            verified.add(member.name)
assert verified == set(selected)
originals = {row['originalPath'] for row in selected.values()}
for process in Path('/proc').iterdir():
    if not process.name.isdigit():
        continue
    links = [process / 'cwd', process / 'exe']
    try:
        links.extend((process / 'fd').iterdir())
    except OSError:
        pass
    for link in links:
        try:
            target = os.readlink(link).removesuffix(' (deleted)')
        except OSError:
            continue
        assert target not in originals
before, allocated = shutil.disk_usage(root).free, 0
for row in selected.values():
    path = Path(row['originalPath'])
    assert path.stat().st_size == row['bytes'] and digest(path) == row['sha256']
    allocated += path.stat().st_blocks * 512
    path.unlink()
result = dict(checkedAt=datetime.now(timezone.utc).isoformat(), packet=str(receipt),
              archiveSha256=record['archiveSha256'], removed=list(selected.values()),
              completeArchivedBytesVerified=sum(row['bytes'] for row in selected.values()),
              fileAllocationBytesRemoved=allocated,
              observedFilesystemFreeDeltaBytes=shutil.disk_usage(root).free-before,
              allSelectedOriginalsRetainedInPackets=True, activeReferences=[], rustToolsExecuted=False)
out = base / 'struct-ci-job-duplicate-retirement.json'
with out.open('x') as stream:
    json.dump(result, stream, indent=2)
print(json.dumps({key: value for key, value in result.items() if key != 'removed'}))
