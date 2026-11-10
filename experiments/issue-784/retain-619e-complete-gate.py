"""Retain the complete guarded gate, including every original audit control."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == '619e356569fdafd369d9f1fad41766f86041d59c'
assert subprocess.check_output(['git', 'diff', 'HEAD', '--name-only'], text=True).strip() == ''
archive = Path('docs/case-studies/issue-784/evidence/current-619e-complete-gate.tar.gz')
receipt = archive.with_name('current-619e-complete-gate.json.gz')
assert not archive.exists() and not receipt.exists()
resource_path = base / 'current-619e-complete-gate.memory.json'
resource = json.loads(resource_path.read_bytes())
assert resource['stopped'] and resource['exitCode'] == 143
assert resource['stopThresholdBytes'] == 2866933760
for pid in [resource['pid'], *resource['stoppedOwnedProcessIds']]:
    assert not Path('/proc/' + str(pid)).exists()
started = resource_path.stat().st_mtime - resource['elapsedSeconds']
attempts = sorted(p for p in Path('js/node_modules/.node-case-deadlines').glob('complete-*')
                  if p.stat().st_mtime >= started - 2)
assert 1 <= len(attempts) <= 32
selected = {p for p in base.iterdir() if p.is_file() and p.name.startswith('current-619e-')
            and p.name != 'current-619e-archive-output.log'}
summaries = []
for attempt in attempts:
    terminal_path = attempt / 'terminal.json'
    terminal = json.loads(terminal_path.read_bytes()) if terminal_path.exists() else None
    if terminal is not None:
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    summaries.append(dict(path=str(attempt), terminal=terminal,
                          terminalPresent=terminal is not None))
    selected.update(p for p in attempt.iterdir() if p.is_file())
paths = sorted(selected | {Path(__file__).relative_to(root)})
assert len(paths) <= 256 and sum(p.stat().st_size for p in paths) < 16 * 1024 * 1024


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid()
    return [info.st_dev, info.st_ino, info.st_mode, info.st_size,
            info.st_mtime_ns, info.st_ctime_ns]


rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p),
             identity=identity(p)) for p in paths]
absolute = {str((root / p).resolve()) for p in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
            maps = (process / 'maps').read_text(errors='replace')
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in absolute
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
        for line in maps.splitlines():
            fields = line.split(None, 5)
            if len(fields) == 6:
                assert fields[5].removesuffix(' (deleted)') not in absolute
    for p, row in zip(paths, rows):
        assert identity(p) == row['identity'] and digest(p) == row['sha256']


def allocation():
    folders = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
               Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
    return sum(p.stat().st_size for folder in folders for p in folder.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)


inactive()
before = allocation()
assert before < 490_000_000
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
assert archive.stat().st_size < 4 * 1024 * 1024
by_path, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
log = (base / 'current-619e-complete-gate.log').read_text()
commands = [json.loads(line) for line in log.splitlines()
            if line.startswith('{"event":"javascript-gate-command"')]
fingerprints = [json.loads(line) for line in log.splitlines()
                if line.startswith('{"event":"javascript-gate-fingerprint"')]
record = dict(schema='complete-619e-guarded-gate-v1', sourceHead=head,
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, audits=summaries, resource=resource,
              commands=commands, fingerprints=fingerprints,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              evidenceBytesBefore=before, rawCopiesRetired=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive()
after = allocation()
assert after < 500_000_000
print(json.dumps(dict(archive=str(archive), bytes=record['bytes'], sha256=record['sha256'],
                     sourceHead=head, members=len(rows), audits=len(attempts),
                     terminalAudits=sum(row['terminalPresent'] for row in summaries),
                     evidenceBytesBefore=before, evidenceBytesAfter=after,
                     fullGatePassed=False)))
