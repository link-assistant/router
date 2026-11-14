"""Inspect one explicitly selected CI canonical artifact with finite storage.

No source output is installed. Complete original manifests and decoded member
hashes are retained; discarded ZIP/output bytes receive no custody claim.
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

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--metadata', type=Path, required=True)
parser.add_argument('--artifact', type=int, required=True)
parser.add_argument('--head', required=True)
parser.add_argument('--merge', required=True)
parser.add_argument('--run', type=int, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
assert re.fullmatch('[a-f0-9]{40}', args.head)
assert re.fullmatch('[a-f0-9]{40}', args.merge)
metadata_raw = args.metadata.read_bytes()
pages = json.loads(metadata_raw)
if isinstance(pages, dict):
    pages = [pages]
artifact, = [row for page in pages for row in page['artifacts']
             if row['id'] == args.artifact]
assert artifact['name'] == 'bulk-drafts-' + args.merge
assert artifact['workflow_run']['id'] == args.run
assert 0 < artifact['size_in_bytes'] <= 96 * 1024 * 1024
assert not artifact['expired'] and not args.output.exists()
assert re.fullmatch('sha256:[a-f0-9]{64}', artifact['digest'])
buffer = io.BytesIO()
child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                          + str(args.artifact) + '/zip'], stdout=subprocess.PIPE)
try:
    while block := child.stdout.read(65536):
        buffer.write(block)
        if buffer.tell() > artifact['size_in_bytes']:
            raise RuntimeError('Archive exceeds the exact API byte count')
    assert child.wait() == 0 and buffer.tell() == artifact['size_in_bytes']
finally:
    child.stdout.close()
    if child.poll() is None:
        child.terminate()
        child.wait()
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
    assert len(entries) <= 200001
    assert len({row.filename for row in entries}) == len(entries)
    assert all(not row.is_dir() and row.file_size <= 67108864 for row in entries)
    assert sum(row.file_size for row in entries) <= 1073741824
    manifest_path, = [row.filename for row in entries if row.filename.endswith('/manifest.json')]
    assert archive.getinfo(manifest_path).file_size <= 16 * 1024 * 1024
    manifest_raw = archive.read(manifest_path)
    manifest = json.loads(manifest_raw)
    assert manifest['schema'] == 'unqualified-complete-bulk-draft-v1'
    assert manifest['inputs']['head'] == args.merge
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
        digest, size, inventory_chunks = hashlib.sha256(), 0, []
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
assert args.metadata.read_bytes() == metadata_raw
record = dict(schema='terminal-canonical-artifact-inspection-v1', headSha=args.head,
    mergeSha=args.merge, runId=args.run, metadata=artifact, archiveSha256=archive_hash,
    metadataSha256=hashlib.sha256(metadata_raw).hexdigest(), archiveRetained=False,
    completeOriginalManifest=manifest, members=members, completeBytes=total,
    allNestedCrcSha256AndCensusVerified=True, inventoryEqualsActualPlanManifest=True,
    currentWorkingTreeFreshnessProved=False, semanticAuthority=False,
    runtimeParity=False, fullGatePassed=False, rustExecuted=False,
    scope='Every complete nested output was inspected. ZIP/source output bytes were '
          'discarded. Complete original manifest and member receipts are retained. '
          'This supplies no custody of the discarded ZIP or source outputs.')
raw = json.dumps(record, separators=(',', ':')).encode()
with args.output.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        compressed.write(raw)
with gzip.open(args.output, 'rb') as source:
    assert source.read() == raw
buffer.close()
print(json.dumps(dict(target=str(args.output), archiveBytes=artifact['size_in_bytes'],
    completeMembers=len(members), completeBytes=total,
    totals=manifest['plan']['manifest']['totals'],
    functionCoverage=manifest['plan']['manifest']['functionCoverage'],
    archiveRetained=False, currentWorkingTreeFreshnessProved=False)))
