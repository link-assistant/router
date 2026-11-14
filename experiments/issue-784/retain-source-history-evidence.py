"""Retain complete source-history drafts and every receiving attempt."""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile

root = Path.cwd()
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
baseline = 'f93b01795a935317942adfe7d329f636dcd1848b'
assert head == 'df6e63a2b' or head.startswith('df6e63a2b')
base = Path('ci-logs/issue-784-restart-2')
archive = Path('docs/case-studies/issue-784/evidence/current-project-source-history.tar.gz')
receipt = archive.with_name('current-project-source-history.json.gz')
assert not archive.exists() and not receipt.exists()
names = [
    'prepare-project-source-origin-cst.mjs', 'prepare-project-facade-retention.mjs',
    'test/project-progress-source-history.mjs', 'test/project-source-origin-cst.test.mjs',
    'test/project-facade-retention.test.mjs', 'test/project-progress-source-history.test.mjs',
]
sources = [Path('tools/translation', name) for name in names]
selected = set(sources + [Path('tools/translation/project.mjs'),
                         Path('experiments/issue-784/retain-source-history-evidence.py')])
selected.update(path for path in base.iterdir() if path.is_file() and path.name.startswith((
    'current-source-history-', 'current-source-origin-isolated-bun',
    'current-facade-retention-isolated-bun', 'current-progress-history-isolated-bun')))
for path in list(selected):
    if path.suffix == '.log':
        for value in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(value).resolve().relative_to(root)
            assert directory.parent == Path('js/node_modules/.node-case-deadlines')
            selected.update(path for path in directory.iterdir() if path.is_file())


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    state = path.stat()
    return [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path), identity=identity(path))
        for path in sorted(selected)]
absolute = {str((root / row['path']).resolve()) for row in rows}
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
        assert len(fields) < 6 or fields[5].removesuffix(' (deleted)') not in absolute
predecessors = [(str(Path('baseline', baseline, path)),
                 subprocess.check_output(['git', 'show', baseline + ':' + str(path)])) for path in sources]
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0, compresslevel=6) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as output:
            for row in rows:
                output.add(row['path'], arcname=row['path'], recursive=False)
            for name, raw in predecessors:
                member = tarfile.TarInfo(name)
                member.size = len(raw)
                output.addfile(member, io.BytesIO(raw))
expected = {row['path']: row for row in rows}
expected.update({name: dict(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()) for name, raw in predecessors})
seen = set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        assert member.size == expected[member.name]['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == expected[member.name]['sha256']
        seen.add(member.name)
assert seen == set(expected)
for row in rows:
    path = Path(row['path'])
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
record = dict(schema='complete-current-project-source-history-v1', recordingHead=head,
              predecessor=baseline, draftSourcesDifferFromRecordingHead=True,
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, predecessors=[dict(path=name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()) for name, raw in predecessors],
              allMembersReadBack=True, focusedNodeCases=12, focusedNodeDeadlineAuditPassed=True,
              isolatedBunCases=12, combinedBunGuardStopped=True,
              downstreamNodeAssertions=24, downstreamNodeDeadlineAuditPassed=False,
              downstreamNodeDeadlineBreaches=3, originalDeadlinesChanged=False,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(archive), bytes=record['bytes'], sha256=record['sha256'], members=len(seen))))
