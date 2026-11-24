"""Retain the closed failed guard proposal and whole receiving observations."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import tarfile

base = Path('ci-logs/issue-784-restart-2')
audit = Path('js/node_modules/.node-case-deadlines/complete-yYBb48')
closed = json.loads((base / 'current-runtime-common-receiving-resource.json').read_bytes())
assert closed['exitCode'] == 1 and closed['stopped'] is False
assert not Path('/proc/' + str(closed['pid'])).exists()
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
paths = sorted([*base.glob('current-runtime-common-*'),
                *(p for p in audit.iterdir() if p.is_file())])
assert 10 <= len(paths) <= 32
assert sum(p.stat().st_size for p in paths) < 1024 * 1024
rows = []
for path in paths:
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    rows.append(dict(path=str(path), bytes=info.st_size,
                     sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
selected = {str(path.resolve()) for path in paths}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for descriptor in (process / 'fd').iterdir():
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
target = Path('docs/case-studies/issue-784/evidence/runtime-guard-trial-20261109.tar.gz')
assert not target.exists()
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as archive:
            for path in paths:
                archive.add(path, arcname=str(path), recursive=False)
expected = {row['path']: row for row in rows}
seen = set()
with tarfile.open(target, mode='r|gz') as archive:
    for member in archive:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        with archive.extractfile(member) as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
receipt = dict(schema='closed-runtime-guard-trial-custody-v1', archive=str(target),
               bytes=target.stat().st_size, sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
               members=rows, allOriginalBytesVerified=True, installed=False,
               completeGatePassed=False, runtimeParity=False, rustExecuted=False)
receipt_path = target.with_name('runtime-guard-trial-20261109.json.gz')
raw = json.dumps(receipt).encode()
with receipt_path.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt_path.read_bytes()) == raw
for path in paths:
    row = expected[str(path)]
    assert path.stat().st_size == row['bytes']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
    path.unlink()
audit.rmdir()
print(json.dumps(receipt))
