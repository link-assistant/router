"""Preserve complete closed receiving observations before retiring own copies."""
import argparse
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
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--group', choices=['clone', 'cst-native', 'native-reuse', 'packed-gate', 'iterable', 'runtime-direct', 'emitter-allocation'], required=True)
args = parser.parse_args()
base = Path('ci-logs/issue-784-restart-2')
attempts = Path('js/node_modules/.node-case-deadlines')
archive = Path('docs/case-studies/issue-784/evidence') / (args.group + '-receiving-20261109.tar.gz')
receipt = archive.with_name(args.group + '-receiving-20261109.json.gz')
assert not archive.exists() and not receipt.exists()
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), attempts]


def allocation():
    return sum(p.stat().st_size for directory in roots for p in directory.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid()
    assert value.st_nlink == 1
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns)


prefixes = ['current-payload-original-profile-',
            'current-project-cst-', 'current-native-ts-profile-',
            'current-native-ts-reuse-receiving-', 'current-client-kind-profile-']
if args.group == 'clone':
    prefixes = ['current-clone-']
if args.group == 'native-reuse':
    prefixes = ['current-native-ts-allocation-', 'current-native-ts-packing-',
                'current-native-ts-packed-', 'current-ingress-native-controls-',
                'current-project-ingress-bun-']
if args.group == 'packed-gate':
    prefixes = ['current-native-packed-gate-']
if args.group == 'iterable':
    prefixes = ['current-project-iterable-']
if args.group == 'runtime-direct':
    prefixes = ['current-native-runtime-direct-']
if args.group == 'emitter-allocation':
    prefixes = ['current-native-emitter-allocation-']
retire = sorted({p for prefix in prefixes for p in base.glob(prefix + '*')
                 if p.is_file()})
selected_attempts = ['complete-g09iRd', 'complete-2pE6rh',
    'complete-2Pw8IJ', 'complete-54coM2', 'complete-pwANSH', 'complete-y5tzIi',
    'complete-DsCGtn', 'complete-YUsQtE']
if args.group == 'clone':
    selected_attempts = ['complete-T6inPf', 'complete-qKJJU2', 'complete-nsRxwS',
                         'complete-Xif0PK', 'complete-PbrQA0']
if args.group == 'native-reuse':
    selected_attempts = ['complete-i9c6Hr', 'complete-eqMSiA',
                         'complete-IIHo7E', 'complete-tAfA7B', 'complete-wjqhwC']
if args.group == 'packed-gate':
    selected_attempts = ['complete-IB8TgE', 'complete-qGBO04']
if args.group == 'iterable':
    selected_attempts = ['complete-1k2DIl', 'complete-mTBIYM', 'complete-sO5BOQ']
if args.group == 'runtime-direct':
    selected_attempts = ['complete-8cmtPh', 'complete-0quOhz']
if args.group == 'emitter-allocation':
    selected_attempts = ['complete-MKYNF7', 'complete-oVTzno']
for name in selected_attempts:
    directory = attempts / name
    assert (directory / 'terminal.json').is_file(), 'Only complete closed attempts'
    retire += sorted(p for p in directory.iterdir() if p.is_file())
sources = [Path(path) for path in subprocess.check_output(
    ['git', 'diff', 'HEAD', '--name-only', '-z']).decode().split('\0') if path]
sources += [Path(path) for path in subprocess.check_output(
    ['git', 'ls-files', '--others', '--exclude-standard', '-z']).decode().split('\0') if path]
sources = sorted(set(sources + [Path(__file__).resolve().relative_to(root)]))
sources = [p for p in sources if p.suffix in ['.mjs', '.md', '.py', '.json']
           and 'evidence' not in p.parts and 'ci-logs' not in p.parts]
paths = sorted(set(retire + sources))
assert 1 <= len(paths) <= 2048
assert sum(p.stat().st_size for p in paths) <= 128 * 1024 * 1024
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
    for path, row in zip(paths, rows):
        assert identity(path) == row['identity'] and digest(path) == row['sha256']


inactive()
before = allocation()
maximum = min(32 * 1024 * 1024, 500_000_000 - before - 1_000_000)
assert maximum > 0


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, value):
        assert self.bytes + len(value) <= maximum, 'Archive prewrite bound'
        count = self.stream.write(value)
        self.bytes += count
        return count

    def flush(self):
        self.stream.flush()


head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=BoundedOutput(target), mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
            for path in sources:
                previous = subprocess.run(['git', 'show', head + ':' + str(path)],
                                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if previous.returncode:
                    assert previous.returncode == 128 and (
                        b'does not exist in' in previous.stderr or
                        b'exists on disk, but not in' in previous.stderr)
                    continue
                raw = previous.stdout
                name = 'git-sources/' + head + '/' + str(path)
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
record = dict(schema='complete-clone-cst-receiving-observations-v1',
    group=args.group,
    archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
    baseline=head, sourceDraftUncommitted=True, members=rows,
    allOriginalBytesVerified=True, originalLimitsChanged=False,
    scope='Full closed observations and current draft sources; selected input identities do not establish historical transitive custody.',
    completeGatePassed=False, runtimeParity=False, rustExecuted=False,
    evidenceBytesBefore=before)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(raw)
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() < 500_000_000
inactive()
for path in retire:
    path.unlink()
for name in selected_attempts:
    (attempts / name).rmdir()
print(json.dumps(dict(archive=str(archive), completeMembers=len(rows),
    archiveBytes=archive.stat().st_size,
    logicalBytesRetired=sum(row['bytes'] for row in rows if row['retire']),
    evidenceBytesAfter=allocation(), fullGatePassed=False)))
