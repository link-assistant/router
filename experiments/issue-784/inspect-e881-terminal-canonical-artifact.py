"""Verify one bounded terminal canonical artifact without retaining its ZIP.

Every nested output is decoded and checked. Retain the complete original
manifest and member receipts; this is inspection, not source/archive custody.
"""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', default='current-matrix-artifacts-final.json')
parser.add_argument('--artifact', type=int, default=13665817864)
parser.add_argument('--head', default='52e2c0461f00e79a1dcd04b475138acd3ec28d17')
parser.add_argument('--merge', default='6c424f706e91fe1b3b9c46e3109659b871b6011f')
parser.add_argument('--run', type=int, default=42596515451)
parser.add_argument('--output', default='current-52e2c04-canonical-inspection.json.gz')
args = parser.parse_args()
assert '/' not in args.snapshot and '/' not in args.output
assert all(re.fullmatch('[0-9a-f]{40}', value) for value in [args.head, args.merge])
snapshot = base / args.snapshot
artifact = next(row for page in json.loads(snapshot.read_bytes())
                for row in page['artifacts'] if row['id'] == args.artifact)
head, merge = args.head, args.merge
assert artifact['name'] == 'bulk-drafts-' + merge
assert 0 < artifact['size_in_bytes'] <= 64 * 1024 * 1024 and not artifact['expired']
assert re.fullmatch('sha256:[0-9a-f]{64}', artifact['digest'])
target = base / args.output
assert not target.exists()
local = base / 'checkpoint-e881-artifact-13750277475.zip.gz'
with gzip.open(local, 'rb') as source:
    raw = source.read(64 * 1024 * 1024 + 1)
assert len(raw) == artifact['size_in_bytes']
buffer = io.BytesIO(raw)
del raw
archive_hash = hashlib.sha256(buffer.getbuffer()).hexdigest()
assert artifact['digest'] == 'sha256:' + archive_hash


class PackedReader:
    def __init__(self, source):
        self.source, self.digest, self.size = source, hashlib.sha256(), 0

    def read(self, size=-1):
        assert size >= 0
        block = self.source.read(min(size, 65536))
        self.digest.update(block)
        self.size += len(block)
        return block


members, total = [], 0
with zipfile.ZipFile(buffer) as archive:
    entries = archive.infolist()
    assert len(entries) <= 200001 and len({row.filename for row in entries}) == len(entries)
    assert all(not row.is_dir() and row.file_size <= 67108864 for row in entries)
    assert sum(row.file_size for row in entries) <= 1073741824
    manifest_path, = [row.filename for row in entries if row.filename.endswith('/manifest.json')]
    manifest_raw = archive.read(manifest_path)
    assert len(manifest_raw) <= 16 * 1024 * 1024
    manifest = json.loads(manifest_raw)
    assert manifest['schema'] == 'unqualified-complete-bulk-draft-v1'
    assert manifest['inputs']['head'] == merge
    assert all(manifest[key] is False for key in ['semanticAuthority', 'sourceAuthority',
               'privatePlanAuthority', 'runtimeParity', 'rustExecuted'])
    declared = {row['path']: row for row in manifest['plan']['outputs']}
    assert len(declared) == len(manifest['plan']['outputs']) == len(manifest['members'])
    prefix, expected = manifest_path.removesuffix('manifest.json'), {manifest_path}
    for row in manifest['members']:
        assert re.fullmatch(r'[0-9]{6}\.gz', row['storedAs'])
        name = prefix + row['storedAs']
        assert name not in expected
        expected.add(name)
        declaration = declared.pop(row['path'])
        assert declaration['bytes'] == row['bytes'] <= 67108864
        assert declaration['sha256'] == row['sha256']
        digest, size = hashlib.sha256(), 0
        inventory_chunks = []
        with archive.open(name) as source:
            packed = PackedReader(source)
            with gzip.GzipFile(fileobj=packed, mode='rb') as decoded:
                while block := decoded.read(65536):
                    size += len(block)
                    assert size <= row['bytes']
                    digest.update(block)
                    if row['path'] == 'parity/rust-source-inventory.json':
                        inventory_chunks.append(block)
            assert packed.size == row['storedBytes']
            assert packed.digest.hexdigest() == row['storedSha256']
        assert size == row['bytes'] and digest.hexdigest() == row['sha256']
        if inventory_chunks:
            assert json.loads(b''.join(inventory_chunks)) == manifest['plan']['manifest']
        total += size
        assert total <= 1073741824
        members.append(dict(path=row['path'], bytes=size, sha256=digest.hexdigest(),
                            storedAs=row['storedAs'], storedBytes=packed.size,
                            storedSha256=packed.digest.hexdigest(), zipCrc=archive.getinfo(name).CRC))
    assert not declared and expected == set(archive.namelist())
    assert total == manifest['completeBytes'] == manifest['plan']['expectedBytes']
record = dict(schema='terminal-canonical-artifact-inspection-v1', headSha=head, mergeSha=merge,
              runId=args.run, metadata=artifact, archiveSha256=archive_hash,
              archiveRetained=True, completeOriginalManifest=manifest, members=members,
              completeBytes=total, allNestedCrcSha256AndCensusVerified=True,
              inventoryEqualsActualPlanManifest=True, currentWorkingTreeFreshnessProved=False,
              semanticAuthority=False, runtimeParity=False, fullGatePassed=False, rustExecuted=False,
              scope='Every complete nested output was inspected. ZIP/source output bytes are '
                    'retained in the complete original local ZIP. Complete original manifest and member receipts are retained. '
                    'This inspection does not establish source freshness or executable parity.')
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        compressed.write(json.dumps(record, separators=(',', ':')).encode())
with gzip.open(target, 'rt') as source:
    assert json.load(source) == record
buffer.close()
print(json.dumps(dict(target=str(target), archiveBytes=artifact['size_in_bytes'],
                      completeMembers=len(members), completeBytes=total,
                      totals=manifest['plan']['manifest']['totals'],
                      functionCoverage=manifest['plan']['manifest']['functionCoverage'],
                      archiveRetained=True, currentWorkingTreeFreshnessProved=False)))
