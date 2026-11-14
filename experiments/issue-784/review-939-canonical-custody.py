"""Read every complete canonical output and compare its declared inputs afresh.

This storage and physical-input review issues no semantic or compiler authority.
It never installs historical outputs over changed compiler inputs.
"""
import codecs
import gzip
import hashlib
import json
from pathlib import Path
import stat
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
archive = base / 'checkpoint939-artifact-13796166594.zip'
custody = json.loads(archive.with_suffix('.json').read_bytes())
target = base / 'checkpoint939-complete-canonical-custody-review.json.gz'
assert not target.exists()
with archive.open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == custody['sha256']


def physical(path):
    parts = Path(path).parts
    assert path and not Path(path).is_absolute() and all(part not in ['.', '..'] for part in parts)
    cursor = Path('.')
    for part in parts:
        cursor /= part
        assert not cursor.is_symlink(), str(cursor)
    if not cursor.exists():
        return None
    before = cursor.stat()
    assert stat.S_ISREG(before.st_mode)
    with cursor.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    after = cursor.stat()
    assert (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) == (
        after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns)
    return dict(bytes=before.st_size, sha256=digest)


class PackedReader:
    def __init__(self, source):
        self.source, self.size, self.digest = source, 0, hashlib.sha256()

    def read(self, size=-1):
        assert size >= 0
        block = self.source.read(min(size, 65536))
        self.size += len(block)
        self.digest.update(block)
        return block


outputs, total = [], 0
with zipfile.ZipFile(archive) as packed:
    expected_zip = {row['path']: row for row in custody['members']}
    assert set(packed.namelist()) == set(expected_zip) and len(packed.namelist()) == len(expected_zip)
    name, = [name for name in packed.namelist() if name.endswith('/manifest.json')]
    manifest_bytes = packed.read(name)
    assert len(manifest_bytes) == expected_zip[name]['bytes'] <= 16 * 1024 * 1024
    assert hashlib.sha256(manifest_bytes).hexdigest() == expected_zip[name]['sha256']
    manifest = json.loads(manifest_bytes)
    assert manifest['schema'] == 'unqualified-complete-bulk-draft-v1'
    assert manifest['inputs']['head'] == 'b0ea6ee80521788e7cba7f47488034c40f5a85e4'
    for key in ['semanticAuthority', 'sourceAuthority', 'privatePlanAuthority', 'runtimeParity', 'rustExecuted']:
        assert manifest[key] is False
    declared = {row['path']: row for row in manifest['plan']['outputs']}
    assert len(declared) == len(manifest['plan']['outputs']) == len(manifest['members']) <= 200000
    seen = {name}
    prefix = name.removesuffix('manifest.json')
    for row in manifest['members']:
        assert len(row['storedAs']) == 9 and row['storedAs'][:6].isdigit() and row['storedAs'].endswith('.gz')
        member = prefix + row['storedAs']
        assert member not in seen and 0 <= row['bytes'] <= 64 * 1024 * 1024
        seen.add(member)
        declaration = declared.pop(row['path'])
        assert declaration['bytes'] == row['bytes'] and declaration['sha256'] == row['sha256']
        digest, size, utf8 = hashlib.sha256(), 0, codecs.getincrementaldecoder('utf8')('strict')
        inventory = []
        with packed.open(member) as source:
            reader = PackedReader(source)
            with gzip.GzipFile(fileobj=reader) as decoded:
                while block := decoded.read(65536):
                    size += len(block)
                    assert size <= row['bytes']
                    digest.update(block)
                    utf8.decode(block)
                    if row['path'] == 'parity/rust-source-inventory.json':
                        inventory.append(block)
                utf8.decode(b'', final=True)
            assert reader.size == row['storedBytes'] == expected_zip[member]['bytes']
            assert reader.digest.hexdigest() == row['storedSha256'] == expected_zip[member]['sha256']
        assert size == row['bytes'] and digest.hexdigest() == row['sha256']
        if inventory:
            assert json.loads(b''.join(inventory)) == manifest['plan']['manifest']
        total += size
        assert total <= 1024 * 1024 * 1024
        current = physical(row['path'])
        outputs.append(dict(declared=row, current=current,
            currentBytesEqual=current == dict(bytes=size, sha256=digest.hexdigest())))
    assert not declared and seen == set(packed.namelist())
    assert total == manifest['completeBytes'] == manifest['plan']['expectedBytes']

inputs = []
original = manifest['inputs']
for kind, rows, prefix in [
    ('compiler', original['compiler'], ''), ('profiles', original['profiles'], ''),
    ('typescript', original['typescript'], 'js/node_modules/typescript/'),
    ('corpus', original['corpus']['sources'], ''), ('cargo', original['corpus']['cargo'], ''),
]:
    for row in rows:
        path = prefix + row['source' if kind in ['corpus', 'cargo'] else 'path']
        current = physical(path)
        inputs.append(dict(kind=kind, declared=row, physicalPath=path, current=current,
            currentBytesEqual=current == dict(bytes=row['bytes'], sha256=row['sha256'])))
record = dict(schema='complete-current-canonical-custody-review-v1',
    publishedHead='93995ee40be4b570becbe0b788dba58f5bd0ea6f', runId=42879038865,
    artifactId=13796166594, archiveSha256=custody['sha256'], archiveRetained=True,
    currentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    completeOriginalManifest=manifest, outputReviews=outputs, inputReviews=inputs,
    completeBytes=total, completeNestedMemberCount=len(outputs),
    completeCrcSha256CensusUtf8AndInventoryReadback=True,
    allCurrentOutputsEqual=all(row['currentBytesEqual'] for row in outputs),
    allCurrentInputPinsEqual=all(row['currentBytesEqual'] for row in inputs),
    outputsInstalled=False, semanticAuthority=False, sourceAuthority=False,
    runtimeParity=False, fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        compressed.write(raw)
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(completeMembers=len(outputs), completeBytes=total,
    differingOutputs=[row['declared']['path'] for row in outputs if not row['currentBytesEqual']],
    differingInputs=[row['physicalPath'] for row in inputs if not row['currentBytesEqual']],
    outputsInstalled=False, semanticAuthority=False)))
