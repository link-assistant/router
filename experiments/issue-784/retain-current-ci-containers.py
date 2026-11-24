"""Move closed current-head CI containers into permanent evidence without copying."""
import argparse
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--write', action='store_true')
args = parser.parse_args()
root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
target = root / 'docs/case-studies/issue-784/evidence/ci-17c7'
head = '17c7dd9942814f2a6a17eee135016e5941f04f15'
snapshot = json.loads((base / 'current-17c7-ci-snapshot-13.json').read_bytes())
logs = json.loads((base / 'current-17c7-ci-logs-13.json').read_bytes())
artifacts = json.loads((base / 'current-17c7-complete-artifact-verification.json').read_bytes())
merge = json.loads((base / 'current-17c7-ci-merge-commit.json').read_bytes())
assert snapshot['headSha'] == logs['snapshot']['headSha'] == artifacts['headSha'] == head
assert snapshot['databaseId'] == artifacts['runId'] == 42467233769
assert snapshot['status'] == 'completed' and logs['completeCycleCollected']
assert len(snapshot['jobs']) == 59 and len(logs['records']) == 28 and len(artifacts['records']) == 25
assert all(row['status'] == 'completed' for row in snapshot['jobs'])
assert subprocess.check_output(['git', 'rev-parse', head + '^{tree}']).decode().strip() == merge['tree']['sha']
assert not target.exists()
paths = sorted(path for path in base.glob('current-17c7-*') if path.is_file())
paths += sorted(path for path in (base / 'current-17c7-complete-cycle').rglob('*') if path.is_file())
assert len(paths) == len(set(paths))
selected = {str(path) for path in paths}


def digest(stream):
    size, hasher = 0, hashlib.sha256()
    while block := stream.read(65536):
        size += len(block)
        hasher.update(block)
    return size, hasher.hexdigest()


def inactive():
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


inactive()
for row in logs['records']:
    path = root / row['log']
    assert str(path) in selected and row['fullReadbackVerified'] and row['validJobLog']
    with gzip.open(path, 'rb') as source:
        assert digest(source) == (row['decodedBytes'], row['sha256'])
for row in artifacts['records']:
    path = root / row['file']
    assert str(path) in selected and row['completeReadbackAndCrcVerified']
    with path.open('rb') as source:
        assert digest(source) == (row['metadata']['size_in_bytes'], row['sha256'])
    with zipfile.ZipFile(path) as archive:
        assert len(archive.infolist()) == len(row['members'])
        for member, expected in zip(archive.infolist(), row['members'], strict=True):
            assert member.filename == expected['path'] and member.CRC == expected['crc']
            with archive.open(member) as source:
                assert digest(source) == (expected['bytes'], expected['sha256'])
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
record = {'schema': 'complete-current-ci-container-retention-v1',
          'publishedHead': head, 'ciMergeHead': merge['sha'], 'tree': merge['tree']['sha'],
          'runId': snapshot['databaseId'], 'runUrl': snapshot['url'],
          'jobConclusions': dict(Counter(row['conclusion'] for row in snapshot['jobs'])),
          'nonpassingJobLogs': 28, 'completeArtifacts': 25,
          'completeArtifactMembers': sum(len(row['members']) for row in artifacts['records']),
          'originals': records, 'contentCopied': False,
          'wholeOriginalReadbackVerified': True, 'artifactCrcVerified': True,
          'allRequiredChecksPassed': False, 'semanticAuthority': False, 'rustExecuted': False}
if args.write:
    inactive()
    target.mkdir()
    for row in records:
        source, destination = root / row['originalPath'], root / row['retainedPath']
        info = source.lstat()
        assert (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns) == (row['device'], row['inode'], row['bytes'], row['mtimeNs'])
        assert not destination.exists()
        destination.parent.mkdir(parents=True, exist_ok=True)
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
                  'artifactMembers': record['completeArtifactMembers'],
                  'jobConclusions': record['jobConclusions']}))
