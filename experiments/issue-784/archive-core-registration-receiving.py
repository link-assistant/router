"""Archive every receiving/diagnostic result before retiring inactive duplicates."""
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
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
assert head == '76e2d5b9e0fdbc3709b864c558bb15651859dc75'
review = json.loads((base / 'core-transport-receiving-review.json').read_bytes())
assert review['frozenNodeRegisteredQualified'] and not review['receivingQualified']
assert len(review['nodeFailed']['registered']) == 4
assert len(review['nodeFailed']['graph']) == 1 and len(review['bunFailed']) == 1
assert len(review['bunCases']) == 73 and not review['bunMissing']
assert review['originalDeadlinesChanged'] is False
source_summary = json.loads((base / 'core-child-current-diagnostics-summary.json').read_bytes())
assert len(source_summary['results']) == 5
trace = json.loads((base / 'core-child-current-profile-result.json').read_bytes())
archive = Path('docs/case-studies/issue-784/evidence/core-registration-receiving-20261110.tar.gz')
receipt = archive.with_suffix('.receipt.json.gz')
assert not archive.exists() and not receipt.exists()
retire = {path for path in base.iterdir() if path.is_file()
          and path.name.startswith(('core-transport-', 'core-child-current-', 'large-native-buffer-', 'private-native-descriptor-kind-'))}
folders, audits = set(), []
for path in sorted(retire):
    if not path.name.endswith('.log'):
        continue
    for name in re.findall(r'^Complete Node deadline evidence: (.+)$', path.read_text(errors='replace'), re.M):
        folder = Path(name).resolve()
        if folder in folders:
            continue
        assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        audit = json.loads((folder / 'case-deadlines.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        assert terminal['allCaseLimitsUnchanged'] and not audit['originalCaseLimitsChanged']
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        folders.add(folder)
        retire.update(path.relative_to(root) for path in folder.iterdir() if path.is_file())
        audits.append(dict(directory=str(folder.relative_to(root)), terminal=terminal, audit=audit))
assert len(folders) == 3
sources = set()
for command in [['git', 'diff', '--name-only', head], ['git', 'ls-files', '--others', '--exclude-standard']]:
    sources.update(Path(path) for path in subprocess.check_output(command).decode().splitlines()
                   if path.startswith(('tools/translation/', 'experiments/issue-784/')))
paths = sorted(retire | sources)
assert len(paths) <= 256 and sum(path.stat().st_size for path in paths) < 64 * 1024 * 1024


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size, value.st_mtime_ns, value.st_ctime_ns)


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path),
             identity=identity(path), retire=path in retire) for path in paths]
selected = {(path.stat().st_dev, path.stat().st_ino) for path in paths}


def inactive():
    unreadable_foreign = []
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
        except FileNotFoundError:
            continue
        except PermissionError:
            status = dict(line.split(':', 1) for line in (process / 'status').read_text().splitlines() if ':' in line)
            if status['State'].strip().startswith('Z'):
                continue
            if int(status['Uid'].split()[1]) == os.getuid():
                raise
            unreadable_foreign.append(int(process.name))
            continue
        for descriptor in descriptors:
            try:
                state = descriptor.stat()
            except (FileNotFoundError, ProcessLookupError):
                continue
            assert (state.st_dev, state.st_ino) not in selected, 'Selected evidence is active'
    for path, row in zip(paths, rows):
        assert identity(path) == row['identity'] and digest(path) == row['sha256']
    return unreadable_foreign


def allocation():
    return sum(path.stat().st_size for parent in ['ci-logs', 'docs/case-studies/issue-784',
               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
               for path in Path(parent).rglob('*') if path.is_file() and not path.is_symlink()
               and 'toolchain' not in path.parts)


foreign = inactive()
before = allocation()
maximum = min(16 * 1024 * 1024, 499_000_000 - before)
assert maximum > 4_000_000


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
                exists = subprocess.run(['git', 'cat-file', '-e', head + ':' + str(path)],
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if exists.returncode:
                    continue
                raw = subprocess.check_output(['git', 'show', head + ':' + str(path)])
                name = 'git-sources/' + head + '/' + str(path)
                member = tarfile.TarInfo(name)
                member.size = len(raw)
                output.addfile(member, io.BytesIO(raw))
                rows.append(dict(path=name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(), retire=False))
by_path, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|gz') as stream:
    for member in stream:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(stream.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
record = dict(schema='complete-Core-registration-receiving-archive-v1', sourceHead=head,
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive), members=rows,
              receivingReview=review, additionalSourceAudits=audits, traceDiagnostic=trace,
              sourceTraceSummary=source_summary, originalDeadlinesChanged=False,
              completeGate=False, productionExecutableGain=0, runtimeParity=False, rustExecuted=False,
              evidenceBytesBefore=before, unreadableForeignProcessIds=foreign,
              firstUntrackedHistoryFailuresRetained=True, laterTimingFailuresRetained=True,
              boundedCallbackBugsRetained=True, descriptorDraftUninstalled=True)
raw = json.dumps(record).encode()
with receipt.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw and allocation() < 500_000_000
inactive()
for path in retire:
    path.unlink()
for folder in folders:
    folder.rmdir()
print(json.dumps(dict(archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
                      members=len(rows), evidenceBytesAfter=allocation(), frozenNodeRegisteredPasses=27, bunObserved=73,
                      receivingQualified=False, fullGatePassed=False)))
