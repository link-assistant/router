"""Retire only two inactive task copies preserved whole in the committed repair."""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile

root = Path('docs/case-studies/issue-784/evidence')
witness = '6189f0c23'
receipt = root / 'current-file-lock-trace-v2.json.gz'
record = json.loads(gzip.decompress(receipt.read_bytes()))
archive = Path(record['archive'])
immutable = subprocess.check_output(['git', 'show', witness + ':' + str(archive)])
assert archive.read_bytes() == immutable
assert len(immutable) == record['bytes']
assert hashlib.sha256(immutable).hexdigest() == record['sha256']
assert subprocess.check_output(['git', 'show', witness + ':' + str(receipt)]) == receipt.read_bytes()
subprocess.run(['git', 'merge-base', '--is-ancestor', witness, 'HEAD'], check=True)
selected = [root / 'current-file-lock-trace.json.gz', root / 'current-file-lock-trace.tar.gz']
expected = {row['path']: row for row in record['members']}
seen = set()
with tarfile.open(fileobj=io.BytesIO(immutable), mode='r|gz') as source:
    for member in source:
        assert member.isfile() and member.name not in seen
        body = source.extractfile(member).read()
        if member.name in expected:
            row = expected[member.name]
            assert len(body) == row['bytes'] and hashlib.sha256(body).hexdigest() == row['sha256']
        else:
            prefix = 'baseline/' + record['recordingHead'] + '/'
            assert member.name.startswith(prefix)
            assert body == subprocess.check_output(['git', 'show', record['recordingHead'] + ':' + member.name[len(prefix):]])
        if Path(member.name) in selected:
            assert Path(member.name).read_bytes() == body
        seen.add(member.name)
assert set(expected) <= seen and all(str(path) in seen for path in selected)
rows = []
for path in selected:
    assert not path.is_symlink()
    state = path.stat()
    identity = [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]
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
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected[str(path)]['sha256']
    current = path.stat()
    assert [current.st_dev, current.st_ino, current.st_size, current.st_mtime_ns, current.st_ctime_ns] == identity
    rows.append(dict(path=str(path), bytes=state.st_size, allocatedBytes=state.st_blocks * 512,
                     sha256=expected[str(path)]['sha256']))
for path in selected:
    path.unlink()
result = dict(schema='inactive-own-initial-packet-retirement-v1', witness=witness,
              archive=str(archive), retainedArchiveSha256=record['sha256'],
              completeImmutableMemberReadbackVerified=True, removed=rows,
              logicalBytesRemoved=sum(row['bytes'] for row in rows),
              allocatedBytesRemoved=sum(row['allocatedBytes'] for row in rows),
              otherPathsRemoved=False, activeBuildsRemoved=False)
destination = root / 'current-file-lock-initial-retirement.json.gz'
with destination.open('xb') as output:
    output.write(gzip.compress(json.dumps(result, separators=(',', ':')).encode(), mtime=0))
assert json.loads(gzip.decompress(destination.read_bytes())) == result
print(json.dumps(result))
