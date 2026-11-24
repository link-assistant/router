"""Retain all 25 complete failed/cancelled job logs by an inode-preserving move."""
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
target = root / 'docs/case-studies/issue-784/evidence/ci-10fd'
head = '10fd7f0da82df707f90b16eb892e8e520f699654'
read = lambda name: json.loads(gzip.decompress((base / name).read_bytes()))
snapshot = read('current-10fd-ci-final-snapshot.json.gz')
logs = read('current-10fd-ci-final-logs.json.gz')
merge = json.loads((base / 'current-10fd-ci-merge-commit.json').read_bytes())
assert snapshot['headSha'] == logs['snapshot']['headSha'] == head
assert snapshot['databaseId'] == 42488211459 and snapshot['status'] == 'completed'
assert len(snapshot['jobs']) == 59 and len(logs['records']) == 25
assert logs['completeCycleCollected'] and all(row['status'] == 'completed' for row in snapshot['jobs'])
assert subprocess.check_output(['git', 'rev-parse', head + '^{tree}']).decode().strip() == merge['tree']['sha']
assert {row['databaseId'] for row in snapshot['jobs'] if row['conclusion'] in ['failure', 'cancelled']} == {
    row['job']['databaseId'] for row in logs['records']}
assert not target.exists()
paths = sorted(path for path in base.glob('current-10fd-*') if path.is_file())
selected = {str(path) for path in paths}


def digest(source):
    size, value = 0, hashlib.sha256()
    while block := source.read(65536):
        size += len(block)
        value.update(block)
    return size, value.hexdigest()


for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for descriptor in (process / 'fd').iterdir():
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
for row in logs['records']:
    path = root / row['log']
    assert str(path) in selected and row['fullReadbackVerified'] and row['validJobLog']
    with gzip.open(path, 'rb') as source:
        assert digest(source) == (row['decodedBytes'], row['sha256'])
records = []
for path in paths:
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_uid == os.getuid()
    with path.open('rb') as source:
        size, sha256 = digest(source)
    records.append({'originalPath': str(path.relative_to(root)),
                    'retainedPath': str((target / path.name).relative_to(root)),
                    'bytes': size, 'sha256': sha256, 'device': info.st_dev,
                    'inode': info.st_ino, 'mtimeNs': info.st_mtime_ns})
record = {'schema': 'complete-current-ci-log-retention-v1',
          'publishedHead': head, 'ciMergeHead': merge['sha'], 'tree': merge['tree']['sha'],
          'runId': snapshot['databaseId'],
          'runUrl': 'https://github.com/link-assistant/router/actions/runs/42488211459',
          'jobConclusions': dict(Counter(row['conclusion'] for row in snapshot['jobs'])),
          'nonpassingJobLogs': 25, 'originals': records, 'contentCopied': False,
          'wholeOriginalReadbackVerified': True, 'allRequiredChecksPassed': False,
          'deadlineArtifactsDownloaded': False,
          'artifactLimit': 'The full 25 nonpassing job logs are retained. Separate CI deadline ZIPs were not downloaded within the fixed task evidence allocation; their audits remain unqualified.',
          'semanticAuthority': False, 'rustExecuted': False}
target.mkdir()
for row in records:
    source, destination = root / row['originalPath'], root / row['retainedPath']
    info = source.lstat()
    assert (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns) == (row['device'], row['inode'], row['bytes'], row['mtimeNs'])
    source.rename(destination)
    info = destination.lstat()
    assert (info.st_dev, info.st_ino, info.st_size) == (row['device'], row['inode'], row['bytes'])
    with destination.open('rb') as stream:
        assert digest(stream) == (row['bytes'], row['sha256'])
with (target / 'manifest.json').open('x') as stream:
    json.dump(record, stream, separators=(',', ':'))
    stream.write('\n')
print(json.dumps({'files': len(records), 'existingBytesMoved': sum(row['bytes'] for row in records),
                  'jobConclusions': record['jobConclusions'], 'nonpassingLogs': 25}))
