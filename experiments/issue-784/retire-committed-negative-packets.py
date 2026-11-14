"""Retire only two inactive task checkout packets after complete Git readback."""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile

root = Path('docs/case-studies/issue-784/evidence')
specifications = [
    ('completed-derive-data-negative', '241d34420d46ac833709b80f68fffc5e937f02c7'),
    ('requested-module-data-negative', '12cb8fc07d3a07fbda0cd5eee36f0cdb621fdddc'),
]
destination = root / 'committed-negative-packets-retirement.json.gz'
assert not destination.exists()
rows = []
for name, witness in specifications:
    receipt = root / (name + '.json.gz')
    record = json.loads(gzip.decompress(receipt.read_bytes()))
    archive = root / (name + '.tar.gz')
    assert record['archive'] == str(archive)
    subprocess.run(['git', 'merge-base', '--is-ancestor', witness, 'HEAD'], check=True)
    assert subprocess.check_output(['git', 'show', witness + ':' + str(receipt)]) == receipt.read_bytes()
    immutable = subprocess.check_output(['git', 'show', witness + ':' + str(archive)])
    assert len(immutable) == record['archiveBytes']
    assert hashlib.sha256(immutable).hexdigest() == record['archiveSha256']
    assert archive.read_bytes() == immutable
    expected = {row['path']: row for row in record['members']}
    seen = set()
    with tarfile.open(fileobj=io.BytesIO(immutable), mode='r|gz') as source:
        for member in source:
            assert member.isfile() and member.name in expected and member.name not in seen
            row = expected[member.name]
            assert member.size == row['bytes']
            assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
            seen.add(member.name)
    assert seen == set(expected)
    assert not archive.is_symlink()
    state = archive.stat()
    identity = [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]
    rows.append(dict(path=str(archive), witness=witness, bytes=state.st_size,
        allocatedBytes=state.st_blocks * 512, identity=identity,
        sha256=record['archiveSha256'], wholeMembers=len(seen),
        completeImmutableMemberReadbackVerified=True))

# Recheck every selected file after both entire packets have been recovered.
for row in rows:
    path = Path(row['path'])
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for descriptor in (process / 'fd').iterdir():
                try:
                    assert os.readlink(descriptor) != str(path.resolve()), 'task copy is active'
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    current = path.stat()
    assert [current.st_dev, current.st_ino, current.st_size,
            current.st_mtime_ns, current.st_ctime_ns] == row['identity']
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
for row in rows:
    Path(row['path']).unlink()
result = dict(schema='inactive-committed-negative-packet-retirement-v1', removed=rows,
    logicalBytesRemoved=sum(row['bytes'] for row in rows),
    allocatedBytesRemoved=sum(row['allocatedBytes'] for row in rows),
    completeImmutableMemberReadbackVerified=True, otherPathsRemoved=False,
    activeBuildsRemoved=False, compilerAuthorityGranted=False)
encoded = json.dumps(result, separators=(',', ':')).encode()
with destination.open('xb') as output:
    output.write(gzip.compress(encoded, mtime=0))
assert gzip.decompress(destination.read_bytes()) == encoded
print(json.dumps(result))
