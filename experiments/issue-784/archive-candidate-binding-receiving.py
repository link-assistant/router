"""Retain complete candidate source and failed receiving evidence.

Only verified inactive task-owned raw duplicates may be retired. Assertion
failures, deadline breaches, rejected author drafts and unrun work stay explicit.
Run after the whole receiving orchestrator and independent review have ended.
"""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
head = '257392ec1'
head = subprocess.check_output(['git', 'rev-parse', head]).decode().strip()
assert subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip() == head
previous = subprocess.check_output(['git', 'rev-parse', head + '^']).decode().strip()
review = json.loads((base / 'binding-receiving-review.json').read_bytes())
assert review['sourceFiles'] == 11
assert review['allOriginalLimitsChanged'] is False
assert review['completeGate'] is False
archive = Path('docs/case-studies/issue-784/evidence/candidate-binding-receiving-20261110.tar.gz')
receipt = archive.with_suffix('.receipt.json.gz')
assert not archive.exists() and not receipt.exists()
prefixes = ('candidate-binding-', 'namespace-closures', 'native-batch-',
            'corrected-native-batch', 'binding-receiving-')
retire = {path for path in base.iterdir()
          if path.is_file() and path.name.startswith(prefixes)}
folder = root / review['nodeAuditDirectory']
assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
retire.update(path.relative_to(root) for path in folder.iterdir() if path.is_file())
sources = {Path(path) for path in subprocess.check_output(
    ['git', 'diff', '--name-only', previous, head]).decode().splitlines()}
sources.update(Path(path) for path in [
    'experiments/issue-784/review-candidate-binding-receiving.py',
    'experiments/issue-784/archive-candidate-binding-receiving.py'])
paths = sorted(retire | sources)
assert len(paths) <= 512
assert sum(path.stat().st_size for path in paths) < 128 * 1024 * 1024


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns)


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path),
             identity=identity(path), retire=path in retire) for path in paths]
selected = {str(path.resolve()) for path in paths}


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
    for path, row in zip(paths, rows):
        assert identity(path) == row['identity'] and digest(path) == row['sha256']


def allocation():
    roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
             Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
    return sum(path.stat().st_size for parent in roots for path in parent.rglob('*')
               if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)


inactive()
before = allocation()
maximum = min(16 * 1024 * 1024, 499_000_000 - before)
assert maximum > 1_000_000


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, value):
        assert self.bytes + len(value) <= maximum
        count = self.stream.write(value)
        self.bytes += count
        return count

    def flush(self):
        self.stream.flush()


with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=BoundedOutput(target), mode='wb', mtime=0, compresslevel=6) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
            for path in sorted(sources):
                exists = subprocess.run(['git', 'cat-file', '-e', previous + ':' + str(path)],
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if exists.returncode:
                    continue
                raw = subprocess.check_output(['git', 'show', previous + ':' + str(path)])
                name = 'git-sources/' + previous + '/' + str(path)
                member = tarfile.TarInfo(name)
                member.size = len(raw)
                output.addfile(member, io.BytesIO(raw))
                rows.append(dict(path=name, bytes=len(raw),
                                 sha256=hashlib.sha256(raw).hexdigest(), retire=False))
by_path, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|gz') as stream:
    for member in stream:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(stream.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
record = dict(schema='complete-candidate-binding-receiving-archive-v1',
              sourceHead=head, sourcePrevious=previous, archive=str(archive),
              bytes=archive.stat().st_size, sha256=digest(archive), members=rows,
              receivingReview=review, allOriginalLimitsChanged=False,
              rejectedAuthorDraftRetained=True, completeGate=False,
              productionExecutableGain=0, runtimeParity=False, rustExecuted=False,
              evidenceBytesBefore=before)
raw = json.dumps(record).encode()
with receipt.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() < 500_000_000
inactive()
for path in retire:
    path.unlink()
folder.rmdir()
print(json.dumps(dict(archive=str(archive), bytes=archive.stat().st_size,
                      sha256=digest(archive), members=len(rows),
                      evidenceBytesAfter=allocation(), completeGate=False,
                      receivingQualified=review['receivingQualified'])))
