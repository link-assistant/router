"""Verify every complete nested custody member and retain actual coverage counts."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import zipfile

base = Path('ci-logs/issue-784-restart-2')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prefix', default='current-74f62')
args = parser.parse_args()
assert re.fullmatch(r'[a-z0-9-]+', args.prefix)
receipt = json.loads(gzip.decompress((base / (args.prefix + '-canonical-artifact-verification.json.gz')).read_bytes()))
assert receipt['completeCrcAndReadbackVerified']


class PackedReader:
    def __init__(self, source):
        self.source, self.digest, self.size = source, hashlib.sha256(), 0

    def read(self, size=-1):
        assert size >= 0
        value = self.source.read(min(size, 65536))
        self.digest.update(value)
        self.size += len(value)
        return value


rows, total = [], 0
with zipfile.ZipFile(receipt['file']) as archive:
    manifest_path = next(name for name in archive.namelist() if name.endswith('/manifest.json'))
    manifest = json.loads(archive.read(manifest_path))
    assert manifest['schema'] == 'unqualified-complete-bulk-draft-v1'
    assert manifest['inputs']['head'] == receipt['mergeSha']
    assert all(manifest[key] is False for key in ['semanticAuthority', 'sourceAuthority', 'privatePlanAuthority', 'runtimeParity', 'rustExecuted'])
    declared = {row['path']: row for row in manifest['plan']['outputs']}
    assert len(declared) == len(manifest['plan']['outputs']) == len(manifest['members'])
    prefix = manifest_path.removesuffix('manifest.json')
    expected = {manifest_path}
    inventory = None
    for row in manifest['members']:
        assert re.fullmatch(r'[0-9]{6}\.gz', row['storedAs'])
        name = prefix + row['storedAs']
        assert name not in expected
        expected.add(name)
        declaration = declared.pop(row['path'])
        assert declaration['bytes'] == row['bytes'] <= 67108864 and declaration['sha256'] == row['sha256']
        digest, size, chunks = hashlib.sha256(), 0, []
        with archive.open(name) as source:
            packed = PackedReader(source)
            with gzip.GzipFile(fileobj=packed, mode='rb') as decoded:
                while block := decoded.read(65536):
                    size += len(block)
                    assert size <= row['bytes']
                    digest.update(block)
                    if row['path'] == 'parity/rust-source-inventory.json':
                        chunks.append(block)
            assert packed.size == row['storedBytes'] and packed.digest.hexdigest() == row['storedSha256']
        assert size == row['bytes'] and digest.hexdigest() == row['sha256']
        if chunks:
            assert inventory is None
            inventory = json.loads(b''.join(chunks))
        total += size
        assert total <= 1073741824
        rows.append(dict(path=row['path'], bytes=size, sha256=digest.hexdigest(), storedAs=row['storedAs']))
    assert not declared and expected == set(archive.namelist())
    assert total == manifest['completeBytes'] == manifest['plan']['expectedBytes']
    assert inventory == manifest['plan']['manifest']
record = dict(schema='complete-canonical-ci-custody-member-verification-v1',
    headSha=receipt['headSha'], mergeSha=receipt['mergeSha'], runId=receipt['runId'],
    archive=receipt['file'], archiveSha256=receipt['archiveSha256'],
    members=rows, completeBytes=total, compilerInputs=len(manifest['inputs']['compiler']),
    profileInputs=len(manifest['inputs']['profiles']), typescriptInputs=len(manifest['inputs']['typescript']),
    totals=inventory['totals'], functionCoverage=inventory['functionCoverage'],
    projects=inventory['projects'], diagnosticCounts=inventory['diagnosticCounts'],
    completeNestedGzipCrcSha256AndCensusVerified=True, inventoryEqualsActualPlanManifest=True,
    generationDataForPublishedMergeOnly=True, currentWorkingTreeFreshnessProved=False,
    semanticAuthority=False, runtimeParity=False, fullGatePassed=False, rustExecuted=False)
target = base / (args.prefix + '-canonical-member-verification.json.gz')
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(path=str(target), completeMembers=len(rows), completeBytes=total,
    totals=record['totals'], productionFunctionCoverage=record['functionCoverage']['production'],
    completeNestedGzipCrcSha256AndCensusVerified=True, currentWorkingTreeFreshnessProved=False)))
