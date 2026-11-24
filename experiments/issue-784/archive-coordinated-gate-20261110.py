"""Retain the entire interrupted gate and every closed audit, including failures."""
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
assert head.startswith('1ec7b77f4')
archive = Path('docs/case-studies/issue-784/evidence/coordinated-gate-20261110.tar.xz')
receipt = archive.with_name('coordinated-gate-20261110.json.gz')
assert not archive.exists() and not receipt.exists()
resource = json.loads((base / 'e881-coordinated-full-gate.memory.json').read_bytes())
assert resource['stopped'] and resource['exitCode'] == 143
assert resource['stopThresholdBytes'] == 2866933760
for pid in [resource['pid'], *resource['stoppedOwnedProcessIds']]:
    assert not Path('/proc/' + str(pid)).exists()
attempts = sorted(Path('js/node_modules/.node-case-deadlines').glob('complete-*'))
assert 1 <= len(attempts) <= 64
retire = {p for p in base.iterdir() if p.is_file() and p.name.startswith(
    ('e881-coordinated-full-gate', 'e881-gate-'))}
retire.add(Path('ci-logs/coordinated-gate-archive.log'))
summaries = []
for attempt in attempts:
    terminal = json.loads((attempt / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    summaries.append(dict(path=str(attempt), exit=terminal['exit'],
                          exitCode=terminal['exitCode'], audit=terminal['auditSummary'],
                          auditError=terminal['auditError'],
                          selectedWholeFiles=len(terminal['allSelectedWholeFiles'])))
    retire.update(p for p in attempt.iterdir() if p.is_file())
paths = sorted(retire | {Path(__file__).relative_to(root)})
assert 1 <= len(paths) <= 512
assert sum(p.stat().st_size for p in paths) < 32 * 1024 * 1024


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


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, value):
        assert self.bytes + len(value) <= 6 * 1024 * 1024
        count = self.stream.write(value)
        self.bytes += count
        return count

    def flush(self):
        self.stream.flush()


inactive()
before = allocation()
with archive.open('xb') as target:
    with lzma.LZMAFile(BoundedOutput(target), mode='wb', preset=1) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
by_path, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|xz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
record = dict(schema='complete-interrupted-coordinated-gate-v1', sourceHead=head,
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, audits=summaries, resource=resource,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              evidenceBytesBefore=before,
              temporaryEvidenceCapExceeded=before >= 500_000_000,
              retiredRawBytes=sum(row['bytes'] for row in rows if row['retire']))
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive()
for p in retire:
    p.unlink()
for attempt in attempts:
    attempt.rmdir()
after = allocation()
assert after < 500_000_000
print(json.dumps(dict(archive=str(archive), bytes=record['bytes'], sha256=record['sha256'],
                      sourceHead=head, members=len(rows), audits=len(attempts),
                      retiredRawBytes=record['retiredRawBytes'],
                      evidenceBytesBefore=before, evidenceBytesAfter=after,
                      fullGatePassed=False)))
