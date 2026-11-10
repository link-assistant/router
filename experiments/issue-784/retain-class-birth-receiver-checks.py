"""Retain complete original Node/Bun files and independent deadline evidence."""
import gzip
import hashlib
import json
from pathlib import Path
import tarfile

base = Path('ci-logs/issue-784-restart-2')
audit = Path('js/node_modules/.node-case-deadlines/complete-DotZN7')
files = [base / ('current-class-birth-receiver-' + name + suffix)
         for name in ['entry', 'program', 'node', 'bun'] for suffix in ['.log', '.memory.json']]
files += sorted(audit.iterdir())
assert len(files) == 14 and all(path.is_file() and not path.is_symlink() for path in files)
target = Path('docs/case-studies/issue-784/evidence/current-class-birth-receiver-checks.tar.gz')
assert not target.exists()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path)) for path in files]
with target.open('xb') as output:
    with gzip.GzipFile(filename='', fileobj=output, mode='wb', compresslevel=3, mtime=0) as encoder:
        with tarfile.open(fileobj=encoder, mode='w|') as archive:
            for row in rows:
                archive.add(row['path'], arcname=row['path'], recursive=False)
with tarfile.open(target, mode='r|gz') as archive:
    for row in rows:
        member = archive.next()
        assert member and member.name == row['path'] and member.isfile() and member.size == row['bytes']
        with archive.extractfile(member) as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
        assert digest(Path(row['path'])) == row['sha256']
    assert archive.next() is None
record = dict(schema='whole-class-birth-receiver-checks-v1', archive=str(target),
              bytes=target.stat().st_size, sha256=digest(target), members=rows,
              completeReadbackVerified=True, fullGatePassed=False, rustExecuted=False)
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
receipt = target.with_name('current-class-birth-receiver-checks.json.gz')
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(record))
