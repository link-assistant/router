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
parser.add_argument('--previous-snapshot', type=Path)
parser.add_argument('--receipts-only', action='store_true')
args = parser.parse_args()
assert args.output.parent == Path('ci-logs/issue-784-restart-2')
assert not args.output.exists()
pages = json.loads(args.snapshot.read_bytes())
artifacts = [row for page in pages for row in page['artifacts']]
records = []
excluded = []
previous = {}
if args.previous_snapshot:
    previous = {row['id']: row for page in json.loads(args.previous_snapshot.read_bytes())
                for row in page['artifacts'] if row['name'].startswith('node-case-deadlines-')}
reused = []
for artifact in artifacts:
    if not artifact['name'].startswith('node-case-deadlines-'):
        excluded.append(artifact)
        continue
    if artifact['id'] in previous:
        original = previous[artifact['id']]
        assert all(artifact[key] == original[key] for key in ['id', 'name', 'size_in_bytes', 'digest'])
        reused.append(artifact)
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
    members, reports, raw_logs = [], [], []
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
            basename = member.filename.rsplit('/', 1)[-1]
            selected_json = basename in ['case-deadlines.json', 'summary.json', 'progress.json', 'terminal.json']
            if member.filename.endswith('.json') and (not args.receipts_only or selected_json):
                assert member.file_size < 16 * 1024 * 1024
                reports.append({'path': member.filename,
                                'value': json.loads(archive.read(member))})
            if args.receipts_only and member.filename.endswith('stderr.raw.log'):
                assert member.file_size < 256 * 1024
                raw_logs.append({'path': member.filename,
                                 'text': archive.read(member).decode('utf8')})
    records.append({'metadata': artifact, 'sha256': archive_hash,
                    'archiveRetained': False, 'allZipMembersReadAndCrcVerified': True,
                    'members': members, 'completeOriginalJsonReports': reports,
                    'completeSelectedRawLogs': raw_logs})
    print(json.dumps({'artifact': artifact['id'], 'members': len(members),
                      'originalJsonReports': len(reports), 'archiveRetained': False}), flush=True)
    buffer.close()
    del reports, members, raw_logs
    gc.collect()
document = {'schema': 'bounded-ci-deadline-inspection-v1', 'snapshot': str(args.snapshot),
            'completeCycleCollected': False, 'records': records, 'excludedArtifacts': excluded,
             'previousSnapshot': str(args.previous_snapshot) if args.previous_snapshot else None,
             'previouslyInspectedArtifacts': reused, 'receiptsOnly': args.receipts_only,
             'scope': 'Whole new ZIP members were decoded and CRC-checked. '
                      + ('Only selected complete deadline/summary/progress/terminal JSON receipts and '
                         'complete stderr raw logs retained; other original JSON is not retained. '
                         if args.receipts_only else 'Complete original JSON reports retained; raw logs discarded. ')
                      + 'Source copies and ZIP bytes were inspected and discarded, not retained. '
                      'Earlier artifact IDs are joined only by exact API identity/size/digest. '
                      'Non-deadline artifacts are excluded, with their original API metadata recorded.'}
with args.output.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(json.dumps(document).encode() + b'\n')
with gzip.open(args.output, 'rt') as source:
    assert json.load(source) == document
