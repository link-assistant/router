"""Retain complete inactive gate/deadline observations, then retire own copies."""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
attempts = Path('js/node_modules/.node-case-deadlines')
archive = Path('docs/case-studies/issue-784/evidence/deadline-memory-20261109.tar.gz')
receipt = archive.with_name('deadline-memory-20261109.json.gz')
assert not archive.exists() and not receipt.exists()
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), attempts]


def allocation():
    return sum(p.stat().st_size for directory in roots for p in directory.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid()
    assert value.st_nlink == 1
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns)


retire = sorted(p for p in attempts.rglob('*') if p.is_file())
retire += sorted(p for pattern in ['current-deadline-*', 'current-canonical-full-gate*']
                 for p in base.glob(pattern) if p.is_file())
retire += [base / name for name in ['current-02bf-forward-command-limit-overrun.json',
    'current-canonical-forward-command-custody.json']]
sources = [Path(name) for name in ['scripts/node-case-deadlines.mjs',
    'scripts/test/node-case-deadlines.test.mjs',
    'experiments/issue-784/audit-complete-source-cohort.mjs',
    'experiments/issue-784/archive-deadline-memory-evidence.py']]
paths = sorted(set([*retire, *sources]))
assert 1 <= len(paths) <= 2048
assert sum(p.stat().st_size for p in paths) <= 64 * 1024 * 1024
assert not any(p.is_symlink() for p in attempts.rglob('*'))
rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p),
             identity=identity(p), retire=p in retire) for p in paths]
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
    for p, row in zip(paths, rows):
        assert identity(p) == row['identity'] and digest(p) == row['sha256']


inactive()
before = allocation()
maximum = min(8 * 1024 * 1024, 499_000_000 - before)
assert maximum > 4 * 1024 * 1024, 'Insufficient evidence headroom'


class BoundedOutput:
    def __init__(self, stream):
        self.stream = stream
        self.bytes = 0

    def write(self, value):
        assert self.bytes + len(value) <= maximum, 'Archive prewrite bound'
        count = self.stream.write(value)
        self.bytes += count
        return count

    def flush(self):
        self.stream.flush()


baseline = '02bf28e5dd6ce7bb90f6a75cfabcb339b895b43a'
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=BoundedOutput(target), mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
            for p in sources[:2]:
                raw = subprocess.check_output(['git', 'show', baseline + ':' + str(p)])
                name = 'git-sources/' + baseline + '/' + str(p)
                member = tarfile.TarInfo(name)
                member.size = len(raw)
                output.addfile(member, io.BytesIO(raw))
                rows.append(dict(path=name, bytes=len(raw),
                                 sha256=hashlib.sha256(raw).hexdigest(), retire=False))
by_path, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, mode='r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        with source.extractfile(member) as stream:
            assert hashlib.file_digest(stream, 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
record = dict(schema='complete-deadline-memory-observations-v1',
    archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
    baseline=baseline, sourceDraftUncommitted=True, members=rows,
    allOriginalBytesVerified=True, originalLimitsChanged=False,
    scope='Full closed observations, including failed and interrupted attempts; preparation does not execute cases.',
    completeGatePassed=False, runtimeParity=False, rustExecuted=False,
    evidenceBytesBefore=before)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(raw)
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() < 500_000_000
inactive()
for p in retire:
    p.unlink()
for p in sorted(attempts.rglob('*'), key=lambda p: len(p.parts), reverse=True):
    assert p.is_dir()
    p.rmdir()
print(json.dumps(dict(archive=str(archive), completeMembers=len(rows),
    archiveBytes=archive.stat().st_size, logicalBytesRetired=sum(row['bytes'] for row in rows if row['retire']),
    evidenceBytesAfter=allocation(), fullGatePassed=False)))
