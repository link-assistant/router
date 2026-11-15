"""Preserve one entire GitHub artifact, including ZIP bytes, with bounded storage.

Compression changes custody storage only. No artifact is installed or admitted.
"""
import argparse
import hashlib
import io
import json
import lzma
import os
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('snapshot', type=Path)
parser.add_argument('artifact_id', type=int)
parser.add_argument('merge_sha')
parser.add_argument('prefix')
args = parser.parse_args()
base = Path('ci-logs/issue-784-restart-2')
assert args.snapshot.parent == base
assert args.prefix.isalnum() and len(args.prefix) <= 40
assert len(args.merge_sha) == 40 and set(args.merge_sha) <= set('0123456789abcdef')
pending, artifacts, decoder = args.snapshot.read_text(), [], json.JSONDecoder()
while pending.strip():
    value, end = decoder.raw_decode(pending.lstrip())
    pending = pending.lstrip()[end:]
    artifacts.extend(value['artifacts'])
selected = [row for row in artifacts if row['id'] == args.artifact_id]
assert len(selected) == 1
artifact = selected[0]
assert not artifact['expired'] and args.merge_sha in artifact['name']
assert 0 < artifact['size_in_bytes'] < 64_000_000
size = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
        size += sum((Path(parent) / name).stat().st_size for name in files
                    if not (Path(parent) / name).is_symlink())
target = base / (args.prefix + '-artifact-' + str(args.artifact_id) + '.zip.xz')
receipt = target.with_suffix('.json')
assert not target.exists() and not receipt.exists()
digest, length, stored = hashlib.sha256(), 0, 0
compressor = lzma.LZMACompressor(preset=1)
process = subprocess.Popen(['gh', 'api', '--allow-escape-sequences',
    'repos/link-assistant/router/actions/artifacts/' + str(args.artifact_id) + '/zip'],
    stdout=subprocess.PIPE)
try:
    with target.open('xb') as output:
        while block := process.stdout.read(65536):
            length += len(block)
            assert length <= artifact['size_in_bytes']
            digest.update(block)
            packed = compressor.compress(block)
            stored += len(packed)
            assert size + stored < 497_000_000
            output.write(packed)
        assert process.wait() == 0
        packed = compressor.flush()
        stored += len(packed)
        assert size + stored < 497_000_000
        output.write(packed)
finally:
    if process.poll() is None:
        process.terminate()
        process.wait()
assert length == artifact['size_in_bytes']
assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + digest.hexdigest()
# One bounded complete ZIP in memory avoids a second 59 MB filesystem copy.
with lzma.open(target, 'rb') as source:
    restored = source.read(64_000_001)
assert len(restored) == length and hashlib.sha256(restored).digest() == digest.digest()
members = []
with zipfile.ZipFile(io.BytesIO(restored)) as archive:
    assert len(archive.infolist()) <= 4096
    assert sum(row.file_size for row in archive.infolist()) < 128_000_000
    for member in archive.infolist():
        count, member_digest = 0, hashlib.sha256()
        with archive.open(member) as source:
            while block := source.read(65536):
                count += len(block)
                member_digest.update(block)
        assert count == member.file_size
        members.append(dict(path=member.filename, bytes=count,
            sha256=member_digest.hexdigest(), crc=member.CRC))
with target.open('rb') as source:
    stored_digest = hashlib.file_digest(source, 'sha256').hexdigest()
record = dict(schema='whole-artifact-compressed-storage-custody-v1', metadata=artifact,
    file=str(target), zipBytes=length, zipSha256=digest.hexdigest(),
    bytes=stored, sha256=stored_digest, members=members,
    completeReadbackAndCrcVerified=True, completeCycleCollected=False,
    artifactInstalled=False, semanticAuthority=False, runtimeParity=False)
with receipt.open('x') as output:
    json.dump(record, output, separators=(',', ':'))
print(json.dumps({key: record[key] for key in ['file', 'zipBytes', 'zipSha256',
    'bytes', 'sha256', 'completeReadbackAndCrcVerified']}), flush=True)
