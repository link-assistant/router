"""Retain complete ordering drafts, receiving attempts and failed CSV probes."""
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
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == 'f93b01795a935317942adfe7d329f636dcd1848b'
archive = Path('docs/case-studies/issue-784/evidence/current-struct-ordering.tar.gz')
receipt = archive.with_name('current-struct-ordering.json.gz')
assert not archive.exists() and not receipt.exists()
sources = [Path(name) for name in [
    'tools/translation/builtin-ordering-struct-ast-route.mjs',
    'tools/translation/builtin-ordering-ast-route.mjs',
    'tools/translation/builtin-derive-bang-footprints.mjs',
    'tools/translation/test/builtin-ordering-namespaces.test.mjs',
    'tools/translation/test/builtin-ordering-struct-namespaces.test.mjs',
    'src/storage/associative.rs',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/retain-struct-ordering-evidence.py',
]]
selected = set(sources)
selected.update(path for path in Path('experiments/issue-784').iterdir()
                if path.is_file() and path.name.startswith((
                    'struct-ordering-', 'trace-original-csv-')))
selected.update(path for path in base.rglob('*') if path.is_file()
                and path.name.startswith(('struct-ordering-',
                    'current-original-csv-', 'current-ordering-original-isolated-bun')))
for folder in base.iterdir():
    if folder.is_dir() and folder.name.startswith('struct-ordering-'):
        selected.update(path for path in folder.rglob('*') if path.is_file())
audits = set()
for path in list(selected):
    if path.suffix == '.log':
        for value in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(value)
            assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            audits.add(directory)
            selected.update(path for path in directory.iterdir() if path.is_file())
paths = sorted(selected)
assert len(paths) < 512


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    return [info.st_dev, info.st_ino, info.st_mode, info.st_size,
            info.st_mtime_ns, info.st_ctime_ns]


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path),
             identity=identity(path), allocatedBytes=path.stat().st_blocks * 512)
        for path in paths]
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


predecessors = []
for path in sources[:5]:
    if path.name in ['builtin-ordering-struct-ast-route.mjs', 'builtin-ordering-struct-namespaces.test.mjs']:
        continue
    raw = subprocess.check_output(['git', 'show', head + ':' + str(path)])
    predecessors.append((str(Path('baseline') / head / path), raw))
inactive()
before = allocation()
assert before < 490_000_000
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=6, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
            for name, raw in predecessors:
                info = tarfile.TarInfo(name)
                info.size = len(raw)
                info.mode = 0o644
                output.addfile(info, io.BytesIO(raw))
assert allocation() < 500_000_000
virtual_rows = [dict(path=name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                     immutableGitPredecessor=head) for name, raw in predecessors]
expected = {row['path']: row for row in rows + virtual_rows}
seen = set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
inactive()
record = dict(schema='complete-struct-ordering-draft-evidence-v1', recordingHead=head,
              draftSourcesDifferFromRecordingHead=True, archive=str(archive),
              bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows + virtual_rows, allMembersReadBack=True,
              auditDirectories=[str(path) for path in sorted(audits)],
              baselineNewFileCases=dict(passed=1, failed=6),
              finalWholeNodeCases=dict(passed=15, failed=0, deadlineAuditPassed=True),
              isolatedBunCases=dict(originalPassed=8, newPassed=7, failed=0),
              combinedBunResourceGuardStopped=True,
              originalCsvNamespaceProbesFailed=True,
              actualSemanticLinkOrderingNamespaceClosed=True,
              wholeCsvReceivingQualified=False, productionExecutableGain=0,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              evidenceBytesBefore=before, evidenceBytesAfter=allocation())
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw and allocation() < 500_000_000
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256',
    'evidenceBytesBefore', 'evidenceBytesAfter']}))
