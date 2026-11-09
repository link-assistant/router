"""Inspect bounded CI archives without retaining another source/log ZIP copy.

Retain complete original JSON receipts and every member's byte/hash inventory.
This is diagnostic evidence, not custody of the discarded archive or sources.
"""
import argparse
import gc
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
assert args.output.parent == Path('ci-logs/issue-784-restart-2')
assert not args.output.exists()
pages = json.loads(args.snapshot.read_bytes())
artifacts = [row for page in pages for row in page['artifacts']]
records = []
excluded = []
for artifact in artifacts:
    if not artifact['name'].startswith('node-case-deadlines-'):
        excluded.append(artifact)
        continue
    assert not artifact['expired'] and artifact['size_in_bytes'] < 16 * 1024 * 1024
    buffer = io.BytesIO()
    process = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                                + str(artifact['id']) + '/zip'], stdout=subprocess.PIPE)
    try:
        while block := process.stdout.read(65536):
            buffer.write(block)
            if buffer.tell() > 16 * 1024 * 1024:
                raise RuntimeError('Original diagnostic archive exceeds bounded memory input')
        assert process.wait() == 0
    finally:
        process.stdout.close()
        if process.poll() is None:
            process.terminate()
            process.wait()
    archive_hash = hashlib.sha256(buffer.getbuffer()).hexdigest()
    assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + archive_hash
    members, reports = [], []
    with zipfile.ZipFile(buffer) as archive:
        assert sum(row.file_size for row in archive.infolist()) < 128 * 1024 * 1024
        for member in archive.infolist():
            assert member.file_size < 64 * 1024 * 1024
            digest, length = hashlib.sha256(), 0
            with archive.open(member) as source:
                while block := source.read(65536):
                    digest.update(block)
                    length += len(block)
            assert length == member.file_size
            members.append({'path': member.filename, 'bytes': length,
                            'sha256': digest.hexdigest(), 'crc': member.CRC})
            if member.filename.endswith('.json'):
                assert member.file_size < 16 * 1024 * 1024
                reports.append({'path': member.filename,
                                'value': json.loads(archive.read(member))})
    records.append({'metadata': artifact, 'sha256': archive_hash,
                    'archiveRetained': False, 'allZipMembersReadAndCrcVerified': True,
                    'members': members, 'completeOriginalJsonReports': reports})
    print(json.dumps({'artifact': artifact['id'], 'members': len(members),
                      'originalJsonReports': len(reports), 'archiveRetained': False}), flush=True)
    buffer.close()
    del reports, members
    gc.collect()
document = {'schema': 'bounded-ci-deadline-inspection-v1', 'snapshot': str(args.snapshot),
            'completeCycleCollected': False, 'records': records, 'excludedArtifacts': excluded,
            'scope': 'Whole ZIP members were decoded and CRC-checked. Complete JSON receipts retained; '
                     'source copies, raw logs and ZIP bytes were inspected and discarded, not retained. '
                     'Non-deadline artifacts are excluded, with their original API metadata recorded.'}
with args.output.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(json.dumps(document).encode() + b'\n')
with gzip.open(args.output, 'rt') as source:
    assert json.load(source) == document
