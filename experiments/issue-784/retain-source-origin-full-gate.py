"""Retain the current registration gate attempt and its unchanged deadline audits."""
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
heads = {
    'current-b366-complete-gate': 'b366d594d8b84bdb7143c516e1863e29c9656e20',
}
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head.startswith(heads['current-b366-complete-gate'])
assert not subprocess.check_output(['git', 'diff', 'HEAD', '--name-only'], text=True).strip()
archive = Path('docs/case-studies/issue-784/evidence/current-source-origin-full-gate.tar.gz')
receipt = archive.with_name('current-source-origin-full-gate.json.gz')
assert not archive.exists() and not receipt.exists()
selected = {Path(__file__).relative_to(root), Path('scripts/check-js-first-local.mjs'),
            Path('scripts/run-node-tests.mjs'),
            Path('tools/translation/js-to-rust/test/native-typescript.test.mjs'),
            Path('experiments/issue-784/run-observed-check.py'),
            Path('experiments/issue-784/with-child-reaper.py'),
            Path('experiments/issue-784/completed-fingerprint-pages.py'),
            Path('js/src/file-lock.mjs'), Path('js/src/storage.mjs'),
            Path('js/test/native-core.test.mjs'), Path('js/test/native-storage.test.mjs'),
            Path('experiments/issue-784/profile-unit-call-ancestors.py'),
            Path('experiments/issue-784/retire-current-proof-unit-data.py'),
            base / 'current-unit-custody-call-ancestry.json.gz',
            base / 'current-unit-data-retirement.json.gz'}
selected.update(path for path in base.iterdir() if path.is_file() and
                (path.name.endswith('-14.json') or path.name == 'current-main-fetch-14.log'))
retiring, attempts = [], []
for prefix, source_head in heads.items():
    resource_path = base / (prefix + '.memory.json')
    resource = json.loads(resource_path.read_bytes())
    assert resource['exitCode'] == 143 and resource['stopThresholdBytes'] == 2866933760
    for pid in [resource['pid'], *resource['stoppedOwnedProcessIds']]:
        assert not Path('/proc/' + str(pid)).exists()
    ended = resource_path.stat().st_mtime
    started = ended - resource['elapsedSeconds']
    audits = []
    for folder in sorted(Path('js/node_modules/.node-case-deadlines').glob('complete-*')):
        if not started - 2 <= folder.stat().st_mtime <= ended + 2:
            continue
        terminal_path = folder / 'terminal.json'
        terminal = json.loads(terminal_path.read_bytes()) if terminal_path.exists() else None
        if terminal is not None:
            assert terminal['childClosed'] and terminal['groupCleanup']['complete']
            assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        files = [path for path in folder.iterdir() if path.is_file()]
        selected.update(files)
        retiring.extend(files)
        audit_path = folder / 'case-deadlines.json'
        audit = json.loads(audit_path.read_bytes()) if audit_path.exists() else None
        audits.append(dict(path=str(folder), terminal=terminal,
                           summary=None if audit is None else {key: audit[key] for key in
                               ['passed', 'observedCompletedCases', 'durationBreaches', 'errors']}))
    selected.update(path for path in base.iterdir() if path.is_file() and
                    path.name.startswith(prefix + '.') and path.suffix in ['.json', '.gz', '.log'])
    commands = [json.loads(line) for line in (base / (prefix + '.log')).read_text().splitlines()
                if line.startswith('{"event":"javascript-gate-command"')]
    attempts.append(dict(prefix=prefix, sourceHead=subprocess.check_output(
        ['git', 'rev-parse', source_head], text=True).strip(), resource=resource,
        commands=commands, audits=audits, fullGatePassed=False))

paths = sorted(selected)
assert len(paths) <= 512


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid()
    return [info.st_dev, info.st_ino, info.st_mode, info.st_size, info.st_mtime_ns, info.st_ctime_ns]


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path),
             identity=identity(path), allocatedBytes=path.stat().st_blocks * 512) for path in paths]
absolute = {str(root / path) for path in paths}


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
    for path, row in zip(paths, rows):
        assert identity(path) == row['identity'] and digest(path) == row['sha256']


def allocation():
    total = 0
    for folder in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                   'js/node_modules/.node-case-deadlines']:
        for directory, directories, files in os.walk(folder):
            directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
            total += sum(Path(directory, name).stat().st_size for name in files)
    return total


inactive()
before = allocation()
assert before < 499_000_000
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=6, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
assert allocation() < 500_000_000
expected, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
inactive()
retiring = sorted(set(retiring))
for path in retiring:
    assert str(path).startswith('js/node_modules/.node-case-deadlines/complete-')
    assert identity(path) == expected[str(path)]['identity']
    path.unlink()
record = dict(schema='complete-current-gate-attempts-v1', recordingHead=head,
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, attempts=attempts, allMembersReadBack=True,
              retiredInactiveAuditPaths=[str(path) for path in retiring],
              retiredLogicalBytes=sum(expected[str(path)]['bytes'] for path in retiring),
              retiredAllocatedBytes=sum(expected[str(path)]['allocatedBytes'] for path in retiring),
              evidenceBytesBefore=before, evidenceBytesAfter=allocation(),
              fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw and allocation() < 500_000_000
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256',
    'retiredLogicalBytes', 'retiredAllocatedBytes', 'evidenceBytesBefore', 'evidenceBytesAfter']}))
