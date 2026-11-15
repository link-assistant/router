"""Retain every terminal f868 CI original by rename with complete readback."""
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
target = root / 'docs/case-studies/issue-784/evidence/ci-f86824ea'
head = 'f86824ea2eff18895db3ea809373457ebeb66a83'
read = lambda name: json.loads((base / ('current-f8682-' + name)).read_bytes())
snapshot = read('terminal-run-7.json')
logs = read('terminal-logs.json')
artifacts = read('artifact-verification-terminal.json')
pages = read('artifacts-terminal.json')
metadata = [row for page in pages for row in page['artifacts']]
merge = read('tested-merge.json')
runs = [row for page in read('terminal-workflows-final.json') for row in page['workflow_runs']]
recovery = read('terminal-whole-run-verification.json')
assert snapshot['headSha'] == logs['snapshot']['headSha'] == artifacts['headSha'] == recovery['headSha'] == head
assert snapshot['databaseId'] == artifacts['runId'] == recovery['runId'] == 42553719103
assert snapshot['status'] == 'completed' and len(snapshot['jobs']) == 59
assert all(row['status'] == 'completed' for row in snapshot['jobs'])
assert len(runs) == 7 and all(row['status'] == 'completed' and row['head_sha'] == head for row in runs)
assert subprocess.check_output(['git', 'rev-parse', head + '^{tree}']).decode().strip() == merge['tree']['sha']
nonpassing = {row['databaseId'] for row in snapshot['jobs'] if row['conclusion'] in ['failure', 'cancelled']}
assert {row['job']['databaseId'] for row in logs['records']} == nonpassing
unavailable = [row for row in logs['records'] if not row['validJobLog']]
assert len(nonpassing) == 23 and len(unavailable) == 1
assert unavailable[0]['job']['databaseId'] == 128954694903 and not logs['completeCycleCollected']
assert read('forward4-retry.exit') == 1
assert b'log not found' in (base / 'current-f8682-forward4-retry.stderr').read_bytes()
assert len(artifacts['records']) == pages[0]['total_count'] == len(metadata)
assert {row['metadata']['id'] for row in artifacts['records']} == {row['id'] for row in metadata}
assert all(merge['sha'] in row['metadata']['name'] for row in artifacts['records'])
assert recovery['wholeArchiveVerified'] and not target.exists()
assert not any(' _ translation (4)' in row['path'] for row in recovery['members'])
paths = sorted(path for path in base.glob('current-f8682-*') if path.is_file())
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
archive_path = base / 'current-f8682-terminal-whole-run.zip'
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
    records.append(dict(originalPath=str(path.relative_to(root)),
                        retainedPath=str((target / path.relative_to(base)).relative_to(root)),
                        bytes=size, sha256=sha256, device=info.st_dev, inode=info.st_ino,
                        mtimeNs=info.st_mtime_ns))
record = dict(schema='complete-terminal-ci-container-retention-v1',
              publishedHead=head, ciMergeHead=merge['sha'], tree=merge['tree']['sha'],
              runId=snapshot['databaseId'], terminalWorkflows=7,
              runUrl='https://github.com/link-assistant/router/actions/runs/42553719103',
              jobConclusions=dict(Counter(row['conclusion'] for row in snapshot['jobs'])),
              nonpassingJobResponses=len(nonpassing), completeNonpassingJobLogs=len(nonpassing)-len(unavailable),
              unavailableJobLogs=[dict(jobId=128954694903, reason='GitHub BlobNotFound; CLI retry log not found; no exact forward shard 4 in whole-run ZIP.')],
              completeLogCollection=False,
              allPublishedArtifactsCollected=True, completeArtifacts=len(artifacts['records']),
              completeArtifactMembers=sum(len(row['members']) for row in artifacts['records']),
              wholeRunArchiveMembers=len(recovery['members']), originals=records,
              contentCopied=False, wholeRetainedBytesReadbackVerified=True, artifactCrcVerified=True,
              foreignUnreadableProcesses=unreadable, allRequiredChecksPassed=False,
              semanticAuthority=False, rustExecuted=False)
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
print(json.dumps(dict(written=args.write, files=len(records),
                      totalExistingBytes=sum(row['bytes'] for row in records),
                      completeNonpassingJobLogs=len(nonpassing)-len(unavailable),
                      unavailableJobLogs=len(unavailable), completeArtifacts=len(artifacts['records']),
                      completeArtifactMembers=record['completeArtifactMembers'],
                      wholeRunArchiveMembers=record['wholeRunArchiveMembers'],
                      jobConclusions=record['jobConclusions'])))
