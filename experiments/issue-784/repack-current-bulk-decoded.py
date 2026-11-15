"""Preserve every full decoded bulk member; retire only inactive gzip wrappers."""
import gzip
import hashlib
import io
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import stat
import tarfile

base = Path('ci-logs/issue-784-restart-2')
original = base / 'checkpoint-7e7-bulk-complete-members.tar.xz'
prior_path = base / 'checkpoint-7e7-bulk-complete-members.json.gz'
prior = json.loads(gzip.decompress(prior_path.read_bytes()))
target = base / 'checkpoint-7e7-bulk-complete-decoded.tar.xz'
receipt = Path('docs/case-studies/issue-784/evidence/ci-7e7-decoded-bulk-custody-20261110.json.gz')
assert not target.exists() and not receipt.exists()
assert prior['completeOriginalMemberBytesRetained'] and prior['completeMemberReadbackVerified']
assert prior['bytes'] == original.stat().st_size == 54415600
assert prior['sha256'] == '4013f112ed9a3c410a9f83da1db9ce315e090927250d6b0dfbf408276774a2a1'

def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return [s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns]

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def inactive(path, expected):
    assert identity(path) == expected
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            fds = list((process / 'fd').iterdir())
        except (FileNotFoundError, PermissionError):
            continue
        for fd in fds:
            try:
                s = fd.stat()
            except (FileNotFoundError, ProcessLookupError):
                continue
            assert [s.st_dev, s.st_ino] != expected[:2]

def allocation():
    return sum(p.stat().st_size for parent in ['ci-logs', 'docs/case-studies/issue-784',
               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
               for p in Path(parent).rglob('*') if p.is_file() and not p.is_symlink()
               and 'toolchain' not in p.parts)

class BoundedMemory(io.BytesIO):
    def write(self, block):
        assert self.tell() + len(block) <= 32 * 1024 * 1024
        return super().write(block)

before = identity(original)
inactive(original, before)
assert digest(original) == prior['sha256']
by_name = {row['path']: row for row in prior['members']}
assert len(by_name) == 2874
packed, rows, seen = BoundedMemory(), [], set()
with lzma.LZMAFile(packed, 'wb', preset=6) as compressed:
    with tarfile.open(fileobj=compressed, mode='w|') as output:
        with tarfile.open(original, 'r|xz') as source:
            for entry in source:
                assert entry.isfile() and entry.name in by_name and entry.name not in seen
                metadata = by_name[entry.name]
                encoded = source.extractfile(entry).read(128 * 1024 * 1024 + 1)
                assert len(encoded) == entry.size == metadata['bytes']
                assert hashlib.sha256(encoded).hexdigest() == metadata['sha256']
                decoded = encoded
                if entry.name.endswith('.gz'):
                    chunks, total = [], 0
                    with gzip.GzipFile(fileobj=io.BytesIO(encoded)) as reader:
                        while block := reader.read(65536):
                            total += len(block)
                            assert total <= 128 * 1024 * 1024
                            chunks.append(block)
                    decoded = b''.join(chunks)
                name = entry.name[:-3] if entry.name.endswith('.gz') else entry.name
                path = PurePosixPath(name)
                assert not path.is_absolute() and '..' not in path.parts
                member = tarfile.TarInfo(name)
                member.size = len(decoded)
                output.addfile(member, io.BytesIO(decoded))
                rows.append(dict(original=metadata, path=name, bytes=len(decoded),
                                 sha256=hashlib.sha256(decoded).hexdigest(),
                                 originalGzipContainerRetained=not entry.name.endswith('.gz')))
                seen.add(entry.name)
assert seen == set(by_name) and len({row['path'] for row in rows}) == len(rows)
expected = {row['path']: row for row in rows}
packed.seek(0)
verified = set()
with tarfile.open(fileobj=packed, mode='r|xz') as source:
    for entry in source:
        row = expected[entry.name]
        assert entry.isfile() and entry.name not in verified and entry.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(entry), 'sha256').hexdigest() == row['sha256']
        verified.add(entry.name)
assert verified == set(expected)
new_bytes = packed.getvalue()
print(json.dumps(dict(proposedBytes=len(new_bytes), evidenceBytes=allocation(), completeMembers=len(rows))), flush=True)
assert len(new_bytes) < original.stat().st_size
assert allocation() + len(new_bytes) + 1_000_000 < 500_000_000
with target.open('xb') as stream:
    stream.write(new_bytes)
new_hash = hashlib.sha256(new_bytes).hexdigest()
assert digest(target) == new_hash
record = dict(schema='complete-current-ci-bulk-decoded-custody-v1', originalArchive=str(original),
              originalArchiveBytes=before[2], originalArchiveSha256=prior['sha256'],
              priorReceipt=str(prior_path), priorReceiptSha256=digest(prior_path),
              retainedArchive=str(target), retainedBytes=len(new_bytes), retainedSha256=new_hash,
              members=rows, completeDecodedPayloadBytes=sum(row['bytes'] for row in rows),
              completeDecodedPayloadsRetained=True, everyOriginalMemberSha256Verified=True,
              completeRetainedReadbackVerified=True, retiredCompressedContainerBytesRetained=False,
              onlyInactiveTaskArtifactRetired=True, semanticAuthority=False, runtimeParity=False,
              logicalBytesReclaimed=before[2]-len(new_bytes))
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive(original, before)
assert digest(original) == prior['sha256']
original.unlink()
assert allocation() < 500_000_000
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
