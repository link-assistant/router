"""Move this completed repair batch's observations without duplicating evidence."""
import hashlib
import json
import os
from pathlib import Path
import stat

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-repair-custody')
assert not target.exists()
prefixes = [
    'current-descriptor-kind-', 'current-ascii-selection-', 'current-static-fixture-',
    'current-static-refresh-', 'current-receiving-fixture-paths-',
    'current-proof-consumer-', 'current-proof-graph-', 'current-owned-freeze-',
    'current-receiving-matrix-custody-', 'current-receiving-draft-',
    'current-closed-export-zip-', 'current-completed-10fd-',
    'current-completed-cycle-main-', 'current-after-proof-bridge-']
paths = sorted(path for path in base.iterdir() if path.is_file()
               and any(path.name.startswith(prefix) for prefix in prefixes))
paths += [Path('experiments/issue-784') / name for name in [
    'final-native-node.log.gz', 'native-node-repaired.log.gz']]
assert 30 <= len(paths) <= 150
absolute = {str(root / path) for path in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd).removesuffix(' (deleted)') not in absolute
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in absolute
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


inactive()
rows = []
for path in paths:
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    rows.append({'originalPath': str(path), 'retainedPath': str(target / path.name),
                 'bytes': info.st_size, 'sha256': digest(path),
                 'device': info.st_dev, 'inode': info.st_ino, 'mtimeNs': info.st_mtime_ns})
assert len({row['retainedPath'] for row in rows}) == len(rows)
record = {'schema': 'complete-current-repair-observation-custody-v1',
          'rows': rows, 'contentCopied': False, 'fullOriginalBytesRetained': True,
          'incompleteOwnedProgressStream': 'The original zero-byte .log.gz is an invalid gzip; all observed bytes remain exact. No stage progress is recovered.',
          'rustExecuted': False, 'fullGatePassed': False}
raw = json.dumps(record, separators=(',', ':')).encode() + b'\n'
inactive()
target.mkdir()
for row in rows:
    source, destination = Path(row['originalPath']), Path(row['retainedPath'])
    info = source.lstat()
    assert (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns) == (
        row['device'], row['inode'], row['bytes'], row['mtimeNs'])
    assert digest(source) == row['sha256']
    source.rename(destination)
    info = destination.lstat()
    assert (info.st_dev, info.st_ino, info.st_size) == (row['device'], row['inode'], row['bytes'])
    assert digest(destination) == row['sha256']
with (target / 'manifest.json').open('xb') as output:
    output.write(raw)
assert json.loads((target / 'manifest.json').read_bytes()) == record
print(json.dumps({'files': len(rows), 'existingBytesMoved': sum(row['bytes'] for row in rows),
                  'allWholeOriginalBytesVerified': True}))
