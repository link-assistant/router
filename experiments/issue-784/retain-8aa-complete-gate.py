"""Preserve the interrupted gate and correct its observed evidence overrun."""
import gzip
import lzma
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
assert head.startswith('8aa6deb90')
assert not subprocess.check_output(['git', 'diff', 'HEAD', '--name-only'], text=True).strip()
archive = Path('docs/case-studies/issue-784/evidence/current-8aa-complete-gate.tar.xz')
receipt = archive.with_name('current-8aa-complete-gate.json.gz')
assert not archive.exists() and not receipt.exists()
selected = set(base.glob('current-8aa-*'))
assert all(path.is_file() for path in selected)
selected.update(Path(path) for path in [
    __file__, 'scripts/check-js-first-local.mjs', 'scripts/run-node-tests.mjs',
    'scripts/node-case-deadlines.mjs',
    'tools/translation/js-to-rust/test/native-typescript.test.mjs',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
    'experiments/issue-784/completed-fingerprint-pages.py',
    'experiments/issue-784/release-inactive-repository-pages.py',
])
selected = {path.relative_to(root) if path.is_absolute() else path for path in selected}
attempts, retiring = [], set(base.glob('current-8aa-*'))
for prefix in ['current-8aa-complete-gate']:
    resource_path = base / (prefix + '.resources.json')
    resource = json.loads(resource_path.read_bytes())
    assert resource['exitCode'] == 143 and resource['stopped']
    assert resource['interrupted'] == 'SIGTERM'
    assert resource['peakSampledCgroupBytes'] < resource['stopThresholdBytes']
    assert not Path('/proc/' + str(resource['completedFingerprintPageAdvice']['pid'])).exists()
    assert resource['containerLimitBytes'] == 3135369216
    for pid in [resource['pid'], *resource['stoppedOwnedProcessIds']]:
        assert not Path('/proc/' + str(pid)).exists()
    log = (base / (prefix + '.log')).read_text()
    ended = resource_path.stat().st_mtime
    started = ended - resource['elapsedSeconds']
    audits = []
    for folder in sorted(Path('js/node_modules/.node-case-deadlines').glob('complete-*')):
        if not started - 2 <= folder.stat().st_mtime <= ended + 2:
            continue
        files = {path for path in folder.iterdir() if path.is_file()}
        selected.update(files)
        retiring.update(files)
        terminal_path, audit_path = folder / 'terminal.json', folder / 'case-deadlines.json'
        terminal = json.loads(terminal_path.read_bytes()) if terminal_path.exists() else None
        if terminal is not None:
            assert terminal['childClosed'] and terminal['groupCleanup']['complete']
            assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        audit = json.loads(audit_path.read_bytes()) if audit_path.exists() else None
        audits.append(dict(path=str(folder), terminal=terminal,
            summary=None if audit is None else {key: audit[key] for key in
                ['passed', 'observedCompletedCases', 'durationBreaches', 'errors']}))
    attempts.append(dict(prefix=prefix, resource=resource, audits=audits,
        commands=[json.loads(line) for line in log.splitlines()
                  if line.startswith('{"event":"javascript-gate-command"')],
        fingerprints=[json.loads(line) for line in log.splitlines()
                      if line.startswith('{"event":"javascript-gate-fingerprint"')]))


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid()
    return [state.st_dev, state.st_ino, state.st_mode, state.st_size,
            state.st_mtime_ns, state.st_ctime_ns]


paths = sorted(selected)
assert len(paths) <= 512 and sum(path.stat().st_size for path in paths) < 32 * 1024 * 1024
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
            for name in files:
                path = Path(directory, name)
                if not path.is_symlink():
                    total += path.stat().st_size
    return total


inactive()
before = allocation()
# The producer exceeded the cap before it could be stopped. Preserve that
# observed violation, then require restored compliance after verified cleanup.
assert 500_000_000 < before < 502_000_000
with archive.open('xb') as target:
    with lzma.LZMAFile(target, 'wb', preset=1) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
temporary_preservation_peak = allocation()
expected, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|xz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
inactive()
for path in sorted(retiring):
    assert str(path).startswith(('js/node_modules/.node-case-deadlines/complete-', 'ci-logs/issue-784-restart-2/current-8aa-'))
    assert identity(path) == expected[str(path)]['identity']
    path.unlink()
record = dict(schema='complete-8aa-interrupted-gate-v1', sourceHead=head,
    archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
    members=rows, attempts=attempts, allMembersReadBack=True,
    retiredInactiveAuditPaths=[str(path) for path in sorted(retiring)],
    retiredLogicalBytes=sum(expected[str(path)]['bytes'] for path in retiring),
    retiredAllocatedBytes=sum(expected[str(path)]['allocatedBytes'] for path in retiring),
    evidenceBytesBefore=before, temporaryPreservationPeakBytes=temporary_preservation_peak,
    evidenceCapBytes=500_000_000, evidenceOverrunObserved=True,
    stoppedForEvidenceBudget=True, evidenceBytesAfter=allocation(),
    fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw and allocation() < 500_000_000
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256',
    'retiredLogicalBytes', 'retiredAllocatedBytes', 'evidenceBytesBefore', 'evidenceBytesAfter']}))
