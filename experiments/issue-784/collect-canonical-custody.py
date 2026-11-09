"""Stream and verify the exact complete canonical CI custody ZIP, without extraction."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
metadata = json.loads((base / 'current-74f62-artifacts-4.json').read_bytes())
artifact = next(row for row in metadata['artifacts'] if row['id'] == 13650976310)
head, merge = '74f62c037a21e4b3e4e3804dcf3d941d0aabfe19', '1ceb354f3e6cf8c3ead0388b76eaaada5cc90e99'
assert artifact['name'] == 'bulk-drafts-' + merge and artifact['size_in_bytes'] == 58474945 and not artifact['expired']
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'), Path('experiments/issue-784'),
         Path('js/node_modules/.node-case-deadlines')]
before = sum(p.stat().st_size for root in roots for p in root.rglob('*')
             if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
assert before + artifact['size_in_bytes'] + 2000000 < 500000000
path = base / 'current-74f62-artifact-13650976310.zip'
length = 0
with path.open('xb') as output, path.with_suffix('.stderr').open('xb') as errors:
    child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/13650976310/zip'],
                             stdout=subprocess.PIPE, stderr=errors)
    while block := child.stdout.read(65536):
        length += len(block)
        if length > artifact['size_in_bytes']:
            child.terminate()
            child.wait()
            raise RuntimeError('Complete canonical custody exceeded exact API byte count')
        output.write(block)
    assert child.wait() == 0
assert length == artifact['size_in_bytes']
with path.open('rb') as source:
    archive_sha256 = hashlib.file_digest(source, 'sha256').hexdigest()
assert artifact['digest'] == 'sha256:' + archive_sha256
members = []
with zipfile.ZipFile(path) as archive:
    entries = archive.infolist()
    assert len(entries) <= 200001 and sum(row.file_size for row in entries) <= 1073741824
    assert len({row.filename for row in entries}) == len(entries)
    for item in entries:
        assert not item.is_dir() and item.file_size <= 67108864
        digest, size = hashlib.sha256(), 0
        with archive.open(item) as source:
            while block := source.read(65536):
                size += len(block)
                digest.update(block)
        assert size == item.file_size
        members.append(dict(path=item.filename, bytes=size, sha256=digest.hexdigest(), crc=item.CRC))
record = dict(schema='complete-canonical-ci-custody-archive-v1', headSha=head, mergeSha=merge,
    runId=42560989296, metadata=artifact, file=str(path), archiveSha256=archive_sha256,
    members=members, completeCrcAndReadbackVerified=True, evidenceBytesBefore=before,
    semanticAuthority=False, fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = base / 'current-74f62-canonical-artifact-verification.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(path=str(path), bytes=length, members=len(members),
    decodedZipBytes=sum(row['bytes'] for row in members), archiveSha256=archive_sha256,
    completeCrcAndReadbackVerified=True, evidenceBytesAfter=before+length+target.stat().st_size)))
