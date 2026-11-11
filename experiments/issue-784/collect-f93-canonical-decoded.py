"""Keep every decoded CI artifact member, with bounded memory and disk custody.

ZIP and nested gzip containers are verified but deliberately not retained.
This is evidence transport only; it installs no generated output or proof.
"""
import gzip
import hashlib
import io
import json
import lzma
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import zipfile

base = Path('ci-logs/issue-784-restart-2')
pages = json.loads((base / 'current-f93-artifact-snapshot-2.json').read_bytes())
metadata, = [row for page in pages for row in page['artifacts'] if row['id'] == 13813764049]
assert metadata['workflow_run']['head_sha'] == 'f93b01795a935317942adfe7d329f636dcd1848b'
assert metadata['size_in_bytes'] == 58771197 and not metadata['expired']
target = base / 'checkpointf93-canonical-complete-decoded.tar.xz'
receipt = base / 'checkpointf93-canonical-complete-decoded.json.gz'
assert not target.exists() and not receipt.exists()


def allocation():
    return sum(path.stat().st_size for parent in ['ci-logs', 'docs/case-studies/issue-784',
               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
               for path in Path(parent).rglob('*') if path.is_file() and not path.is_symlink()
               and 'toolchain' not in path.parts and '__pycache__' not in path.parts)


class BoundedMemory(io.BytesIO):
    def __init__(self, bound):
        super().__init__()
        self.bound = bound

    def write(self, block):
        assert self.tell() + len(block) <= self.bound
        return super().write(block)


assert allocation() + 34 * 1024 * 1024 < 500_000_000
original = BoundedMemory(64 * 1024 * 1024)
with (base / 'checkpointf93-canonical-download.stderr').open('xb') as errors:
    child = subprocess.Popen(['gh', 'api', metadata['archive_download_url']],
                             stdout=subprocess.PIPE, stderr=errors)
    try:
        while block := child.stdout.read(65536):
            original.write(block)
    except BaseException:
        child.terminate()
        child.wait()
        raise
    assert child.wait() == 0
assert original.tell() == metadata['size_in_bytes']
original_hash = hashlib.sha256(original.getbuffer()).hexdigest()
assert metadata['digest'] == 'sha256:' + original_hash
original.seek(0)
packed, rows, names, total = BoundedMemory(32 * 1024 * 1024), [], set(), 0
with zipfile.ZipFile(original) as source:
    entries = source.infolist()
    assert len(entries) <= 4096
    assert sum(entry.file_size for entry in entries) <= 128 * 1024 * 1024
    assert all(not entry.is_dir() for entry in entries)
    with lzma.LZMAFile(packed, 'wb', preset=6) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as output:
            for index, entry in enumerate(entries):
                assert entry.file_size <= 128 * 1024 * 1024
                encoded = source.read(entry)  # Complete read also checks ZIP CRC.
                assert len(encoded) == entry.file_size
                decoded = encoded
                if entry.filename.endswith('.gz'):
                    with gzip.GzipFile(fileobj=io.BytesIO(encoded)) as reader:
                        decoded = reader.read(128 * 1024 * 1024 + 1)
                        assert len(decoded) <= 128 * 1024 * 1024 and not reader.read(1)
                name = entry.filename[:-3] if entry.filename.endswith('.gz') else entry.filename
                path = PurePosixPath(name)
                assert not path.is_absolute() and '..' not in path.parts and name not in names
                total += len(decoded)
                assert total <= 512 * 1024 * 1024
                member = tarfile.TarInfo(name)
                member.size = len(decoded)
                output.addfile(member, io.BytesIO(decoded))
                rows.append(dict(path=name, bytes=len(decoded), sha256=hashlib.sha256(decoded).hexdigest(),
                                 originalPath=entry.filename, originalBytes=len(encoded),
                                 originalSha256=hashlib.sha256(encoded).hexdigest(), originalCrc=entry.CRC))
                names.add(name)
                if (index + 1) % 512 == 0:
                    print(json.dumps(dict(completeMembers=index + 1, decodedBytes=total)), flush=True)
expected = {row['path']: row for row in rows}
packed.seek(0)
seen = set()
with tarfile.open(fileobj=packed, mode='r|xz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == names and len(rows) == len(entries)
raw = packed.getvalue()
assert allocation() + len(raw) + 1_000_000 < 500_000_000
with target.open('xb') as output:
    output.write(raw)
with target.open('rb') as source:
    retained_hash = hashlib.file_digest(source, 'sha256').hexdigest()
assert retained_hash == hashlib.sha256(raw).hexdigest()
record = dict(schema='complete-ci-canonical-decoded-custody-v1', metadata=metadata,
              originalZipBytes=len(original.getbuffer()), originalZipSha256=original_hash,
              originalZipAndGzipContainersRetained=False, retainedArchive=str(target),
              retainedBytes=len(raw), retainedSha256=retained_hash, members=rows,
              completeDecodedPayloadBytes=total, completeMemberReadbackAndCrcVerified=True,
              completeDecodedPayloadsRetained=True, installedAsCurrent=False,
              semanticAuthority=False, runtimeParity=False, completeCycleCollected=False)
encoded_receipt = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(encoded_receipt, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == encoded_receipt
assert allocation() < 500_000_000
print(json.dumps({key: value for key, value in record.items() if key not in ['metadata', 'members']}))
