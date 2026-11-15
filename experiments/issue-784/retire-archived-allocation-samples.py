"""Retire only the 188 inactive task samples after complete packet readback."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import tarfile

root = Path(__file__).resolve().parents[2]
folder = root / 'ci-logs/issue-784-restart-2/ordinary-current-allocation-samples'
receipt = root / 'ci-logs/issue-784-restart-2/archived-allocation-retirement.json'
assert not receipt.exists() and not folder.is_symlink()
manifest = json.loads(gzip.decompress((root /
    'docs/case-studies/issue-784/evidence/project-retention-complete.json.gz').read_bytes()))
assert manifest['allDecodedOriginalsVerified'] and manifest['allSelectedOriginalsUnchanged']
rows = {row['path']: row for row in manifest['members']
        if Path(row['originalPath']).parent == folder}
assert len(rows) == 188


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
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
            assert target != str(folder) and not target.startswith(str(folder) + '/')


inactive()
files = list(folder.iterdir())
assert len(files) == len(rows) and all(path.is_file() and not path.is_symlink() for path in files)
assert {str(path.relative_to(root)) for path in files} == set(rows)
for name, row in rows.items():
    path = root / name
    assert path.stat().st_size == row['bytes'] and digest(path) == row['sha256']
archive = Path(manifest['archive'])
assert archive.is_relative_to(root) and not archive.is_symlink()
assert archive.stat().st_size == manifest['archiveBytes'] and digest(archive) == manifest['archiveSha256']
verified, complete = set(), {}
with tarfile.open(archive, 'r|xz') as source:
    for member in source:
        actual = None
        if member.isfile():
            with source.extractfile(member) as stream:
                actual = (member.size, hashlib.file_digest(stream, 'sha256').hexdigest())
        elif member.islnk():
            actual = complete[member.linkname]
        if actual is not None:
            complete[member.name] = actual
        if member.name in rows:
            row = rows[member.name]
            assert member.name not in verified and actual == (row['bytes'], row['sha256'])
            verified.add(member.name)
assert verified == set(rows)
inactive()
allocated = 0
for name, row in rows.items():
    path = root / name
    assert path.stat().st_size == row['bytes'] and digest(path) == row['sha256']
    allocated += path.stat().st_blocks * 512
before = shutil.disk_usage(root).free
shutil.rmtree(folder)
result = {'removedDirectory': str(folder), 'files': list(rows.values()),
          'completeArchivedBytesVerified': sum(row['bytes'] for row in rows.values()),
          'fileAllocationBytesRemoved': allocated,
          'observedFilesystemFreeDeltaBytes': shutil.disk_usage(root).free - before,
          'archiveSha256': manifest['archiveSha256'], 'allCompleteOriginalsRetained': True,
          'rustToolsExecuted': False}
with receipt.open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({key: value for key, value in result.items() if key != 'files'}))
