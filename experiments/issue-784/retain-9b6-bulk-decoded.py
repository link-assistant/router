"""Retain every decoded member of the exact canonical CI artifact, sequentially."""
import gzip
import hashlib
import io
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import zipfile

base = Path('ci-logs/issue-784-restart-2')
raw = (base / 'checkpoint-9b6-current-artifacts.json').read_text()
decoder, artifacts = json.JSONDecoder(), []
while raw.strip():
    page, end = decoder.raw_decode(raw.lstrip())
    artifacts.extend(page['artifacts'])
    raw = raw.lstrip()[end:]
metadata = next(row for row in artifacts if row['id'] == 13766313795)
assert metadata['name'] == 'bulk-drafts-f1ff442658abc26aa871d30c66d5349e488eb9c6'
assert metadata['size_in_bytes'] == 58727116 and not metadata['expired']
target = base / 'checkpoint-9b6-bulk-complete-decoded.tar.xz'
receipt = base / 'checkpoint-9b6-bulk-complete-decoded.json.gz'
assert not target.exists() and not receipt.exists()


class BoundedBuffer(io.BytesIO):
    def write(self, block):
        assert self.tell() + len(block) <= 64 * 1024 * 1024
        return super().write(block)


encoded, digest = BoundedBuffer(), hashlib.sha256()
child = subprocess.Popen(['gh', 'api', '--allow-escape-sequences',
    'repos/link-assistant/router/actions/artifacts/' + str(metadata['id']) + '/zip'], stdout=subprocess.PIPE)
with child.stdout as source:
    while block := source.read(65536):
        encoded.write(block)
        digest.update(block)
assert child.wait() == 0 and encoded.tell() == metadata['size_in_bytes']
assert metadata['digest'] == 'sha256:' + digest.hexdigest()
encoded.seek(0)
packed, rows, decoded_total = BoundedBuffer(), [], 0
with zipfile.ZipFile(encoded) as archive:
    entries = archive.infolist()
    assert 1 <= len(entries) <= 4096
    assert len({entry.filename for entry in entries}) == len(entries)
    assert sum(entry.file_size for entry in entries) <= 128 * 1024 * 1024
    with lzma.LZMAFile(packed, 'wb', preset=3) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as output:
            for entry in entries:
                assert not entry.is_dir() and entry.file_size <= 128 * 1024 * 1024
                path = PurePosixPath(entry.filename)
                assert not path.is_absolute() and '..' not in path.parts
                # Reading to EOF verifies ZIP CRC before retaining decoded DATA.
                with archive.open(entry) as source:
                    member = source.read(128 * 1024 * 1024 + 1)
                assert len(member) == entry.file_size
                original_sha = hashlib.sha256(member).hexdigest()
                decoded = member
                if entry.filename.endswith('.gz'):
                    buffer = BoundedBuffer()
                    with gzip.GzipFile(fileobj=io.BytesIO(member)) as source:
                        while block := source.read(65536):
                            buffer.write(block)
                    decoded = buffer.getvalue()
                name = entry.filename.removesuffix('.gz')
                decoded_total += len(decoded)
                assert decoded_total <= 512 * 1024 * 1024
                info = tarfile.TarInfo(name)
                info.size = len(decoded)
                output.addfile(info, io.BytesIO(decoded))
                rows.append(dict(originalPath=entry.filename, originalBytes=len(member),
                                 originalSha256=original_sha, originalCrc=entry.CRC,
                                 path=name, bytes=len(decoded), sha256=hashlib.sha256(decoded).hexdigest()))
assert len({row['path'] for row in rows}) == len(rows)
encoded.close()
packed.seek(0)
with tarfile.open(fileobj=packed, mode='r|xz') as archive:
    for row, member in zip(rows, archive, strict=True):
        assert member.isfile() and member.name == row['path'] and member.size == row['bytes']
        with archive.extractfile(member) as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
allocation = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
        allocation += sum((Path(parent) / name).stat().st_size for name in files
                          if not (Path(parent) / name).is_symlink())
size = packed.getbuffer().nbytes
print(json.dumps(dict(proposedBytes=size, evidenceBytes=allocation, members=len(rows))), flush=True)
assert allocation + size + 1_000_000 < 500_000_000
packed.seek(0)
with target.open('xb') as output:
    while block := packed.read(65536):
        output.write(block)
with target.open('rb') as source:
    retained_sha = hashlib.file_digest(source, 'sha256').hexdigest()
assert target.stat().st_size == size
with tarfile.open(target, 'r|xz') as archive:
    for row, member in zip(rows, archive, strict=True):
        assert member.isfile() and member.name == row['path'] and member.size == row['bytes']
        with archive.extractfile(member) as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
record = dict(schema='complete-9b6-ci-bulk-decoded-custody-v1', originalMetadata=metadata,
              originalZipSha256=digest.hexdigest(), originalZipRetained=False,
              everyOriginalMemberCrcAndSha256Verified=True,
              everyDecodedPayloadRetained=True, decodedPayloadBytes=decoded_total,
              retainedArchive=str(target), retainedBytes=size, retainedSha256=retained_sha,
              completeInMemoryAndPhysicalReadbackVerified=True, members=rows,
              runtimeParity=False, fullGatePassed=False, currentCompilerFreshness=False,
              scope='Published merge checkout computed DATA. No current-tree installation or compiler authority.')
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
