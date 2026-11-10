"""Preserve complete closed namespace repair and registration evidence.

Successful receiving cohorts and the earlier frozen-input refusal remain
distinct. Archive recovery and inactive-file checks precede raw retirement.
This receipt supplies no semantic, parity or performance authority.
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
head = '7dadfb75623a0ae7e047a682ec7abdcab08a8bdd'
previous = subprocess.check_output(['git', 'rev-parse', head + '^']).decode().strip()
assert subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip() == head
archive = Path('docs/case-studies/issue-784/evidence/namespace-receiving-20261110.tar.gz')
receipt = archive.with_suffix('.receipt.json.gz')
assert not archive.exists() and not receipt.exists()
retire = {p for p in base.glob('namespace-*') if p.is_file()}
audits, bun_cases = [], []
for name, count, success in [('project', 25, True), ('receiving', 17, True),
                              ('registered', 27, True), ('bulk', 6, False)]:
    log = (base / ('namespace-' + name + '-node.log')).read_text()
    matches = re.findall(r'^Complete Node deadline evidence: (.+)$', log, re.M)
    assert len(matches) == 1
    folder = Path(matches[0]).resolve()
    assert folder.parent == (root / 'js/node_modules/.node-case-deadlines').resolve()
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    audit = json.loads((folder / 'case-deadlines.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    assert terminal['exitCode'] == (0 if success else 1)
    assert audit['passed'] and audit['observedCompletedCases'] == count
    assert not audit['errors'] and not audit['durationBreaches']
    retire.update(p.relative_to(root) for p in folder.iterdir() if p.is_file())
    audits.append(dict(cohort=name, folder=str(folder.relative_to(root)),
                       completed=count, assertionsPassed=success,
                       deadlineAuditPassed=True, childExitCode=terminal['exitCode']))
    if not success:
        assert 'untracked profile inputs must be frozen before fingerprinting' in log
        continue
    bun = (base / ('namespace-' + name + '-bun.log')).read_text()
    rows = re.findall(r'^\(pass\) (.+) \[([0-9.]+)ms\]$', bun, re.M)
    assert len(rows) == count and re.search(r'\n ' + str(count) + r' pass\n 0 fail\n', bun)
    for case, duration in rows:
        original = [row for row in audit['records'] if row['name'] == case]
        assert len(original) == 1
        deadline = original[0]['deadline']
        if deadline['kind'] == 'finite-source-deadline':
            assert float(duration) + 0.01 <= deadline['milliseconds']
        bun_cases.append(dict(cohort=name, name=case, milliseconds=float(duration),
                              precisionMs=0.01, originalDeadline=deadline))
assert len(bun_cases) == 69
sources = set()
for command in [['git', 'diff', '--name-only', previous],
                ['git', 'ls-files', '--others', '--exclude-standard']]:
    sources.update(Path(p) for p in subprocess.check_output(command).decode().splitlines()
                   if p.startswith(('tools/translation/', 'experiments/issue-784/')))
paths = sorted(retire | sources)
assert len(paths) <= 512 and sum(p.stat().st_size for p in paths) < 64 * 1024 * 1024


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
selected = {str(p.resolve()) for p in paths}


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
maximum = min(12 * 1024 * 1024, 499_000_000 - before)
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
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
            for p in sorted(sources):
                exists = subprocess.run(['git', 'cat-file', '-e', previous + ':' + str(p)],
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if exists.returncode:
                    continue
                raw = subprocess.check_output(['git', 'show', previous + ':' + str(p)])
                name = 'git-sources/' + previous + '/' + str(p)
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
record = dict(schema='complete-namespace-receiving-v1', sourceHead=head,
              sourcePrevious=previous, archive=str(archive), bytes=archive.stat().st_size,
              sha256=digest(archive), members=rows, nodeCasesPassed=69, bunCasesPassed=69,
              nodeAudits=audits, bunCases=bun_cases, originalLimitsChanged=False,
              earlierFrozenInputFailureRetained=True, fullGatePassed=False,
              productionExecutableGain=0, runtimeParity=False, rustExecuted=False,
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
for item in audits:
    Path(item['folder']).rmdir()
print(json.dumps(dict(archive=str(archive), bytes=archive.stat().st_size,
                      sha256=digest(archive), members=len(rows),
                      evidenceBytesAfter=allocation(), fullGatePassed=False)))
