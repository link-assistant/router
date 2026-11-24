"""Retain every complete auditor file for the current original receiving checks."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile

base = Path('js/node_modules/.node-case-deadlines')
target = Path('docs/case-studies/issue-784/evidence/current-9b6-repair-batch')
path = target / 'complete-receiving-audits.tar.gz'
assert not path.exists()
members = []
with path.open('xb') as output, gzip.GzipFile(filename='', mode='wb', fileobj=output,
                                            compresslevel=3, mtime=0) as packed:
    with tarfile.open(fileobj=packed, mode='w|') as archive:
        for name in ['complete-uz4OC1', 'complete-eoOF7u', 'complete-UQITEF']:
            for source in sorted((base / name).iterdir()):
                assert source.is_file() and not source.is_symlink()
                raw = source.read_bytes()
                entry = tarfile.TarInfo(name + '/' + source.name)
                entry.size = len(raw)
                archive.addfile(entry, io.BytesIO(raw))
                members.append(dict(path=entry.name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
with tarfile.open(path, 'r|gz') as archive:
    for entry, expected in zip(archive, members, strict=True):
        assert entry.name == expected['path'] and entry.size == expected['bytes']
        assert hashlib.file_digest(archive.extractfile(entry), 'sha256').hexdigest() == expected['sha256']
receipt = target / 'complete-receiving-audits.json.gz'
raw = (json.dumps(dict(schema='complete-current-receiving-audits-v1', members=members,
                       completeReadbackVerified=True, runtimeParity=False, fullGatePassed=False),
                  separators=(',', ':')) + '\n').encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(path), members=len(members), bytes=path.stat().st_size)))
