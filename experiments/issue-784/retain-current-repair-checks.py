"""Archive exact whole-file check inputs, complete streams and deadline records."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import tarfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--name', required=True)
parser.add_argument('--file', action='append', default=[])
parser.add_argument('--audit', action='append', default=[])
args = parser.parse_args()
assert args.name.replace('-', '').isalnum()
files = [Path(path) for path in args.file]
for directory in args.audit:
    files.extend(sorted(Path(directory).iterdir()))
assert files and len(set(files)) == len(files)
assert all(path.is_file() and not path.is_symlink() for path in files)
base = Path('docs/case-studies/issue-784/evidence') / args.name
target = base.with_suffix('.tar.gz')


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
record = dict(schema='complete-current-repair-checks-v1', archive=str(target),
              bytes=target.stat().st_size, sha256=digest(target), members=rows,
              completeReadbackVerified=True, fullGatePassed=False, rustExecuted=False)
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
receipt = base.with_suffix('.json.gz')
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(target), bytes=record['bytes'], sha256=record['sha256'],
                      members=len(rows), completeReadbackVerified=True)))
