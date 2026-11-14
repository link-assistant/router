"""Preserve four exact inactive DATA directories from the incomplete unit run."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess

root = Path(__file__).resolve().parents[2]
names = ['4GW42s', 'JELYho', 'kTnrNP', 'UcKRJi']
directories = [Path('/tmp/router-owned-unit-matches-data-' + name) for name in names]
base = root / 'ci-logs/issue-784-restart-2'
label = 'current-unit-application-incomplete-data'


def identity(path):
    value = path.lstat()
    if not stat.S_ISREG(value.st_mode) or value.st_uid != os.getuid() or value.st_nlink != 1:
        raise RuntimeError('Ordinary task-owned DATA file required')
    return [value.st_dev, value.st_ino, value.st_mode, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns]


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        links = [process / 'cwd', process / 'exe']
        try:
            links.extend((process / 'fd').iterdir())
        except OSError:
            pass
        for link in links:
            try:
                target = os.readlink(link).removesuffix(' (deleted)')
            except OSError:
                continue
            if any(target == str(path) or target.startswith(str(path) + '/')
                   for path in directories):
                raise RuntimeError('Active task DATA directory')


inactive()
members, identities, roots = [], {}, []
for directory in directories:
    state = directory.lstat()
    if directory.is_symlink() or not directory.is_dir() or state.st_uid != os.getuid():
        raise RuntimeError('Exact ordinary task-owned directory required')
    files = sorted(directory.iterdir())
    if not 1 <= len(files) <= 1000:
        raise RuntimeError('Bounded complete task DATA directory required')
    roots.append({'path': str(directory), 'files': len(files),
                  'indexPresent': (directory / 'index.json').exists(),
                  'failurePresent': (directory / 'failure.json').exists()})
    for path in files:
        identities[str(path)] = identity(path)
        members.append({'path': 'temporary-DATA/' + directory.name + '/' + path.name,
                        'originalPath': str(path), 'bytes': path.stat().st_size,
                        'sha256': digest(path)})
if sum(row['bytes'] for row in members) > 10_000_000:
    raise RuntimeError('Original task DATA bound exceeded')
manifest = base / (label + '-manifest.json')
with manifest.open('x') as stream:
    json.dump({'members': members}, stream)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip()
archive = root / 'docs/case-studies/issue-784/evidence' / (label + '.tar.xz')
receipt = base / (label + '-capture.json')
subprocess.check_call(['python3', '-B', 'tools/evidence/capture-packet.py',
    '--source-root', str(root), '--head', head, '--manifest', str(manifest),
    '--archive', str(archive), '--receipt', str(receipt), '--cap-seconds', '600'], cwd=root)
raw = receipt.read_bytes()
target = archive.with_name(label + '.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(raw))
if gzip.decompress(target.read_bytes()) != raw:
    raise RuntimeError('Complete capture receipt readback differs')
inactive()
for row in members:
    path = Path(row['originalPath'])
    if identity(path) != identities[str(path)] or digest(path) != row['sha256']:
        raise RuntimeError('Original task DATA changed after complete archive readback')
allocated = sum(Path(row['originalPath']).stat().st_blocks * 512 for row in members)
for directory in directories:
    shutil.rmtree(directory)
record = {'schema': 'incomplete-unit-application-DATA-retirement-v1',
          'roots': roots, 'archive': str(archive), 'archiveBytes': archive.stat().st_size,
          'completeOriginalBytesRetained': sum(row['bytes'] for row in members),
          'fileAllocationBytesRemoved': allocated, 'allArchiveMembersReadBack': True,
          'applicationRunComplete': False, 'originalTestDeadlinesQualified': False,
          'runtimeParity': False}
with (base / (label + '-retirement.json')).open('x') as stream:
    json.dump(record, stream, indent=2)
print(json.dumps(record))
