"""Retain this closed receiving cohort and retire only its verified raw copies."""
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
archive = Path('docs/case-studies/issue-784/evidence/project-progress-20261109.tar.gz')
receipt = archive.with_suffix('').with_suffix('.json.gz')
baseline = 'a9b168c54c48e150e403da429bd4bf77c1c7f773'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip() == baseline
assert not archive.exists() and not receipt.exists()
prefixes = ('project-progress-', 'project-byte-return-', 'current-native-receiving-a9b-',
            'current-a9b168-canonical-', 'current-2340-')
retire = {p for p in base.iterdir() if p.is_file() and p.name.startswith(prefixes)}
attempts = [Path('js/node_modules/.node-case-deadlines') / value
            for value in ['complete-37yqdg', 'complete-k5hGoO', 'complete-CigcVr']]
for attempt in attempts:
    terminal = json.loads((attempt / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    retire.update(p for p in attempt.iterdir() if p.is_file())
sources = set()
for args in [['git', 'diff', '--name-only', baseline],
             ['git', 'ls-files', '--others', '--exclude-standard']]:
    sources.update(Path(p) for p in subprocess.check_output(args).decode().splitlines()
                   if p.startswith(('tools/translation/', 'experiments/issue-784/')))
paths = sorted(retire | sources)
assert 1 <= len(paths) <= 512
assert sum(p.stat().st_size for p in paths) <= 32 * 1024 * 1024


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns)


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


def allocation():
    roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
             Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
    return sum(p.stat().st_size for folder in roots for p in folder.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)


inactive()
before = allocation()
maximum = min(4 * 1024 * 1024, 499_000_000 - before)
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
    with gzip.GzipFile(fileobj=BoundedOutput(target), mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
            for p in sorted(sources):
                exists = subprocess.run(['git', 'cat-file', '-e', baseline + ':' + str(p)],
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if exists.returncode:
                    continue
                raw = subprocess.check_output(['git', 'show', baseline + ':' + str(p)])
                name = 'git-sources/' + baseline + '/' + str(p)
                member = tarfile.TarInfo(name)
                member.size = len(raw)
                output.addfile(member, io.BytesIO(raw))
                rows.append(dict(path=name, bytes=len(raw),
                                 sha256=hashlib.sha256(raw).hexdigest(), retire=False))
by_path, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
record = dict(schema='complete-project-progress-receiving-v1', baseline=baseline,
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, originalLimitsChanged=False, nodeCasesPassed=33, bunCasesPassed=33,
              nativeAssertionsPassed=9, nativeDeadlinePassed=False,
              nativeRegenerationObservedMs=64335.027529, nativeRegenerationOriginalLimitMs=60000,
              canonicalCheckInterrupted=True, actualProductionGainMeasured=False,
              invalidInheritedThenProbeRetained=True, fullGatePassed=False,
              runtimeParity=False, rustExecuted=False, evidenceBytesBefore=before)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(raw)
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() < 500_000_000
inactive()
for p in retire:
    p.unlink()
for attempt in attempts:
    attempt.rmdir()
print(json.dumps(dict(archive=str(archive), bytes=archive.stat().st_size,
                      sha256=digest(archive), members=len(rows),
                      evidenceBytesAfter=allocation(), fullGatePassed=False)))
