"""Retain the terminal published cycle without duplicating whole containers."""
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
target = root / 'docs/case-studies/issue-784/evidence/ci-567e1dd0'
head = '567e1dd0b072a2bfd736a9025ba245a630aaff7d'
run_id = 42518964289
read = lambda name: json.loads((base / ('current-567e1dd0-' + name)).read_bytes())
snapshot, logs = read('ci-view-16.json'), read('ci-logs-view-16.json')
artifacts, metadata = read('terminal-artifact-verification.json'), read('terminal-artifacts.json')
merge, runs = read('ci-merge.json'), read('terminal-runs.json')['workflow_runs']
tree = merge['commit']['tree']['sha']
recovery = read('terminal-whole-run-verification.json')
assert snapshot['headSha'] == logs['snapshot']['headSha'] == artifacts['headSha'] == recovery['headSha'] == head
assert snapshot['databaseId'] == artifacts['runId'] == recovery['runId'] == run_id
assert snapshot['status'] == 'completed' and len(snapshot['jobs']) == 59
assert all(row['status'] == 'completed' for row in snapshot['jobs'])
assert len(runs) == 7 and all(row['status'] == 'completed' and row['head_sha'] == head for row in runs)
assert subprocess.check_output(['git', 'rev-parse', head + '^{tree}']).decode().strip() == tree
nonpassing = {row['databaseId'] for row in snapshot['jobs'] if row['conclusion'] in ['failure', 'cancelled']}
assert {row['job']['databaseId'] for row in logs['records']} == nonpassing and len(nonpassing) == 25
unavailable = [row for row in logs['records'] if not row['validJobLog']]
assert len(unavailable) == 1 and unavailable[0]['job']['databaseId'] == 128848041746
assert not logs['completeCycleCollected']
assert len(artifacts['records']) == metadata['total_count'] == len(metadata['artifacts']) == 24
assert {row['metadata']['id'] for row in artifacts['records']} == {row['id'] for row in metadata['artifacts']}
assert all(merge['sha'] in row['metadata']['name'] for row in artifacts['records'])
assert recovery['wholeArchiveVerified'] and recovery['exitCode'] == 0
assert not recovery['byteLimitExceeded'] and len(recovery['members']) == 216
assert not any(' _ translation (5)' in row['path'] for row in recovery['members'])
assert not target.exists()
paths = sorted(path for path in base.glob('current-567e1dd0-*') if path.is_file())
assert len(paths) == len(set(paths))
selected = {str(path) for path in paths}
spec = importlib.util.spec_from_file_location('completed_pages', root / 'experiments/issue-784/completed-fingerprint-pages.py')
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


def digest(stream):
    size, hasher = 0, hashlib.sha256()
    while block := stream.read(65536):
        size += len(block)
        hasher.update(block)
    return size, hasher.hexdigest()


def inactive():
    active, unreadable = pages.active_paths(root)
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
archive_path = base / 'current-567e1dd0-terminal-whole-run.zip'
assert archive_path.stat().st_size == recovery['bytes']
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
          'nonpassingJobResponses': 25, 'completeNonpassingJobLogs': 24,
          'unavailableJobLogs': [{'jobId': 128848041746, 'reason': 'GitHub BlobNotFound; CLI retry returned log not found; whole-run ZIP has no forward translation (5) members.'}],
          'completeLogCollection': False, 'allPublishedArtifactsCollected': True,
          'completeArtifacts': 24,
          'completeArtifactMembers': sum(len(row['members']) for row in artifacts['records']),
          'wholeRunArchiveMembers': 216, 'originals': records, 'contentCopied': False,
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
                  'completeNonpassingJobLogs': 24, 'unavailableJobLogs': 1,
                  'completeArtifactMembers': record['completeArtifactMembers'],
                  'jobConclusions': record['jobConclusions']}))
