"""Retain terminal CI originals by rename, including unavailable-log evidence."""
import argparse
from collections import Counter
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--write', action='store_true')
args = parser.parse_args()
root = Path.cwd().resolve()
base = root / 'ci-logs/issue-784-restart-2'
target = root / 'docs/case-studies/issue-784/evidence/ci-764222b6'
head = '764222b6e6d4f0ce1efb0341396cfb6a87661e85'
run_id = 42529550250
read = lambda name: json.loads((base / ('current-764-' + name)).read_bytes())
snapshot, logs = read('ci-progress-15.json'), read('terminal-log-snapshot.json')
artifacts, pages = read('artifact-verification-final.json'), read('artifact-pages-final.json')
metadata = [row for page in pages for row in page['artifacts']]
merge, runs = read('tested-merge.json'), read('terminal-workflows.json')['workflow_runs']
recovery = read('terminal-whole-run-verification.json')
tree = merge['tree']['sha']
assert snapshot['headSha'] == logs['snapshot']['headSha'] == artifacts['headSha'] == recovery['headSha'] == head
assert snapshot['databaseId'] == artifacts['runId'] == recovery['runId'] == run_id
assert snapshot['status'] == 'completed' and len(snapshot['jobs']) == 59
assert all(row['status'] == 'completed' for row in snapshot['jobs'])
assert len(runs) == 7 and all(row['status'] == 'completed' and row['head_sha'] == head for row in runs)
assert subprocess.check_output(['git', 'rev-parse', head + '^{tree}']).decode().strip() == tree
nonpassing = {row['databaseId'] for row in snapshot['jobs'] if row['conclusion'] in ['failure', 'cancelled']}
assert {row['job']['databaseId'] for row in logs['records']} == nonpassing and len(nonpassing) == 24
unavailable = [row for row in logs['records'] if not row['validJobLog']]
assert len(unavailable) == 1 and unavailable[0]['job']['databaseId'] == 128880489169
assert not logs['completeCycleCollected']
assert len(artifacts['records']) == pages[0]['total_count'] == len(metadata) == 24
assert {row['metadata']['id'] for row in artifacts['records']} == {row['id'] for row in metadata}
assert all(merge['sha'] in row['metadata']['name'] for row in artifacts['records'])
assert recovery['wholeArchiveVerified'] and len(recovery['members']) == 249
assert not any(' _ translation (7)' in row['path'] for row in recovery['members'])
assert not target.exists()
paths = sorted(path for path in base.glob('current-764-*') if path.is_file())
selected = {str(path) for path in paths}
spec = importlib.util.spec_from_file_location('completed_pages', root / 'experiments/issue-784/completed-fingerprint-pages.py')
pages_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages_module)


def digest(stream):
    size, hasher = 0, hashlib.sha256()
    while block := stream.read(65536):
        size += len(block)
        hasher.update(block)
    return size, hasher.hexdigest()


def inactive():
    active, unreadable = pages_module.active_paths(root)
    assert not selected.intersection(name.removesuffix(' (deleted)') for name in active)
    return unreadable


def verify_zip(path, members):
    assert str(path) in selected
    with zipfile.ZipFile(path) as archive:
        assert len(archive.infolist()) == len(members)
        for member, expected in zip(archive.infolist(), members, strict=True):
            assert member.filename == expected['path'] and member.CRC == expected['crc']
            with archive.open(member) as source:
                assert digest(source) == (expected['bytes'], expected['sha256'])


unreadable = inactive()
for row in logs['records']:
    path = root / row['log']
    assert str(path) in selected and row['fullReadbackVerified']
    with gzip.open(path, 'rb') as source:
        assert digest(source) == (row['decodedBytes'], row['sha256'])
    if not row['validJobLog']:
        with gzip.open(path, 'rb') as source:
            assert b'BlobNotFound' in source.read(65536)
for row in artifacts['records']:
    path = root / row['file']
    assert row['completeReadbackAndCrcVerified']
    with path.open('rb') as source:
        assert digest(source) == (row['metadata']['size_in_bytes'], row['sha256'])
    verify_zip(path, row['members'])
archive_path = base / 'current-764-terminal-whole-run.zip'
with archive_path.open('rb') as source:
    assert digest(source) == (recovery['bytes'], recovery['sha256'])
verify_zip(archive_path, recovery['members'])
records = []
for path in paths:
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_uid == os.getuid()
    with path.open('rb') as source:
        size, sha256 = digest(source)
    assert size == info.st_size
    records.append({'originalPath': str(path.relative_to(root)),
                    'retainedPath': str((target / path.relative_to(base)).relative_to(root)),
                    'bytes': size, 'sha256': sha256, 'device': info.st_dev,
                    'inode': info.st_ino, 'mtimeNs': info.st_mtime_ns})
record = {'schema': 'terminal-ci-container-retention-with-unavailable-log-v1',
          'publishedHead': head, 'ciMergeHead': merge['sha'], 'tree': tree,
          'runId': run_id, 'runUrl': 'https://github.com/link-assistant/router/actions/runs/' + str(run_id),
          'terminalWorkflows': 7,
          'jobConclusions': dict(Counter(row['conclusion'] for row in snapshot['jobs'])),
          'nonpassingJobResponses': 24, 'completeNonpassingJobLogs': 23,
          'unavailableJobLogs': [{'jobId': 128880489169, 'reason': 'GitHub BlobNotFound; CLI retry returned log not found; whole-run ZIP has no forward translation (7) members.'}],
          'completeLogCollection': False, 'allPublishedArtifactsCollected': True,
          'completeArtifacts': 24,
          'completeArtifactMembers': sum(len(row['members']) for row in artifacts['records']),
          'wholeRunArchiveMembers': 249, 'originals': records, 'contentCopied': False,
          'wholeRetainedBytesReadbackVerified': True, 'artifactCrcVerified': True,
          'foreignUnreadableProcesses': unreadable,
          'allRequiredChecksPassed': False, 'semanticAuthority': False, 'rustExecuted': False}
if args.write:
    assert inactive() == unreadable
    target.mkdir()
    for row in records:
        source, destination = root / row['originalPath'], root / row['retainedPath']
        info = source.lstat()
        assert (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns) == (row['device'], row['inode'], row['bytes'], row['mtimeNs'])
        assert not destination.exists()
        source.rename(destination)
        info = destination.lstat()
        assert (info.st_dev, info.st_ino, info.st_size) == (row['device'], row['inode'], row['bytes'])
        with destination.open('rb') as stream:
            assert digest(stream) == (row['bytes'], row['sha256'])
    with (target / 'manifest.json').open('x') as stream:
        json.dump(record, stream, indent=2)
        stream.write('\n')
print(json.dumps({'written': args.write, 'files': len(records),
                  'totalExistingBytes': sum(row['bytes'] for row in records),
                  'completeNonpassingJobLogs': 23, 'unavailableJobLogs': 1,
                  'completeArtifactMembers': record['completeArtifactMembers'],
                  'jobConclusions': record['jobConclusions']}))
