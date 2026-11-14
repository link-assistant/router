"""Stream, verify and retire only this completed CI cycle's inactive evidence."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import tarfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prefix', required=True)
args = parser.parse_args()
assert re.fullmatch('[a-z0-9-]{1,70}', args.prefix)
root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
cycle = json.loads(gzip.decompress((base / (args.prefix + '-final-cycle.json.gz')).read_bytes()))
assert cycle['allTerminalResultsCollected'] and cycle['allArtifactsInspected']
assert cycle['allAvailableNonpassingLogsCollected']
paths = sorted(base.glob(args.prefix + '-*'))
assert 1 <= len(paths) <= 512 and all(p.is_file() and not p.is_symlink() for p in paths)
assert sum(p.stat().st_size for p in paths) <= 128 * 1024 * 1024
assert all(Path(row['path']) in paths for row in cycle['inputReceipts'])
assert all(Path(row[key]) in paths for row in cycle['availableLogs'] + cycle['unavailableLogs']
           for key in ['log', 'stderr'])
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]


def allocation():
    return sum(p.stat().st_size for directory in roots if directory.exists()
               for p in directory.rglob('*') if p.is_file() and not p.is_symlink()
               and 'toolchain' not in p.parts)


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as source:
        while block := source.read(65536):
            value.update(block)
    return value.hexdigest()


def identity(path):
    value = path.lstat()
    return [value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_nlink]


rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p), identity=identity(p))
        for p in paths]
selected = {str((root / p).resolve()) for p in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
    for path, row in zip(paths, rows, strict=True):
        assert identity(path) == row['identity'] and digest(path) == row['sha256']


inactive()
before = allocation()
maximum = min(16 * 1024 * 1024, 500_000_000 - before - 1_000_000)
assert maximum > 0


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, data):
        assert self.bytes + len(data) <= maximum
        self.bytes += len(data)
        return self.stream.write(data)

    def flush(self):
        return self.stream.flush()


target = Path('docs/case-studies/issue-784/evidence') / (args.prefix + '-terminal-ci.tar.gz')
total = 0
with target.open('xb') as output, gzip.GzipFile(fileobj=BoundedOutput(output), mode='wb', mtime=0) as zipped:
    with tarfile.open(fileobj=zipped, mode='w|') as archive:
        for path, row in zip(paths, rows, strict=True):
            assert identity(path) == row['identity']
            info = tarfile.TarInfo(str(path))
            info.size, info.mode, info.mtime = row['bytes'], 0o644, 0
            with path.open('rb') as source:
                archive.addfile(info, source)
            total += row['bytes']
with tarfile.open(target, 'r:gz') as archive:
    assert archive.getnames() == [row['path'] for row in rows]
    for row, member in zip(rows, archive.getmembers(), strict=True):
        value, size = hashlib.sha256(), 0
        with archive.extractfile(member) as source:
            while block := source.read(65536):
                size += len(block)
                value.update(block)
        assert size == row['bytes'] and value.hexdigest() == row['sha256']
receipt = dict(schema='complete-terminal-ci-evidence-archive-v2', path=str(target),
               bytes=target.stat().st_size, sha256=digest(target), decodedBytes=total,
               members=rows, everyMemberReadbackVerified=True,
               headSha=cycle['headSha'], runId=cycle['runId'],
               scope='Complete terminal CI inspection evidence; discarded upstream '
                     'artifact archives and their source payloads are not in custody.',
               rustExecuted=False, fullGatePassed=False, runtimeParity=False)
receipt_path = target.with_suffix('.receipt.json.gz')
raw = json.dumps(receipt, separators=(',', ':')).encode()
with receipt_path.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt_path.read_bytes()) == raw
assert allocation() < 500_000_000
inactive()
for path in paths:
    path.unlink()
print(json.dumps(dict(path=str(target), bytes=receipt['bytes'], sha256=receipt['sha256'],
                      members=len(rows), retiredBytes=total,
                      evidenceBeforeBytes=before, evidenceAfterBytes=allocation(),
                      everyMemberReadbackVerified=True)))
