"""Retain every closed proof-source attempt, including incomplete whole files."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
evidence = Path('docs/case-studies/issue-784/evidence')
target = evidence / 'current-source-proof-origin.tar.gz'
receipt = evidence / 'current-source-proof-origin.json.gz'
assert not target.exists() and not receipt.exists()
changed = [Path('tools/translation/' + name + '.mjs') for name in [
    'prepare-source-proof-preservation', 'prepare-current-core-unit-unicode']]
selected = set(changed)
selected.update(Path('tools/translation/test/' + name + '.test.mjs') for name in [
    'source-proof-origin', 'source-proof-preservation', 'router-core-unit-matches',
    'router-core-unicode-predicates'])
selected.update(Path(name) for name in [
    'tools/translation/concrete-source-origin-phases.mjs',
    'tools/translation/prepare-source-origin-concrete-phases.mjs',
    'tools/translation/test/complete-source-metadata-receiving.mjs',
    'tools/translation/test/unit-matches-relocation-fixture.mjs',
    'tools/translation/test/unit-matches-data-archive.mjs',
    'experiments/issue-784/check-source-proof-origin-bun.py',
    'experiments/issue-784/sample-active-unit-custody.mjs',
    'experiments/issue-784/retain-source-proof-origin.py',
    'experiments/issue-784/current-source-proof-origin-plan.md',
    'docs/case-studies/issue-784/current-source-proof-origin.md'])
selected.update(path for path in base.iterdir() if path.is_file()
    and path.name.startswith(('current-source-proof-', 'current-unit-custody-active-sample'))
    and not path.name.startswith('current-source-proof-retention'))
selected.update(base / ('current-' + part + '-13.json') for part in [
    'issue-784', 'issue-comments', 'pr-conversation', 'pr-inline', 'pr-reviews'])
for path in list(selected):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name).resolve().relative_to(Path.cwd())
            assert directory.parent == Path('js/node_modules/.node-case-deadlines')
            selected.update(child for child in directory.iterdir() if child.is_file())
for path in selected:
    if path.name.endswith('.memory.json'):
        record = json.loads(path.read_bytes())
        assert record['exitCode'] is not None and not Path('/proc/' + str(record['pid'])).exists()
data_directories = [Path('/tmp/router-owned-unit-matches-data-' + suffix) for suffix in [
    '1KaZea', '6GE3wS', 'CTQytL', 'KSCmw6', 'n2RGrw', 'ol1TVE', 'zX8Yjz']]
data_files = {path for directory in data_directories for path in directory.iterdir()}
assert len(data_files) == 625
selected.update(data_files)

def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

def allocation():
    paths = set(data_files)
    for parent in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                   'js/node_modules/.node-case-deadlines']:
        paths.update(path for path in Path(parent).rglob('*') if path.is_file()
            and not path.is_symlink() and 'toolchain' not in path.parts
            and '__pycache__' not in path.parts)
    return sum(path.stat().st_size for path in paths)

rows = []
for path in sorted(selected):
    assert path.is_file() and not path.is_symlink()
    state = path.stat()
    name = str(path) if not path.is_absolute() else 'closed-task-data/' + str(path.relative_to('/tmp'))
    rows.append(dict(path=str(path), archivePath=name, bytes=state.st_size,
        sha256=digest(path), identity=[state.st_dev, state.st_ino, state.st_size,
                                     state.st_mtime_ns, state.st_ctime_ns]))
assert allocation() + sum(row['bytes'] for row in rows) + 1_000_000 < 500_000_000
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
predecessors = {str(path): subprocess.check_output(['git', 'show', head + ':' + str(path)])
                for path in changed}
expected = {row['archivePath']: row for row in rows}
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as archive:
            for row in rows:
                archive.add(row['path'], arcname=row['archivePath'], recursive=False)
            for path, body in predecessors.items():
                name = 'baseline/' + head + '/' + path
                member = tarfile.TarInfo(name)
                member.size = len(body)
                archive.addfile(member, io.BytesIO(body))
                expected[name] = dict(bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
seen = set()
with tarfile.open(target, 'r|gz') as archive:
    for member in archive:
        assert member.isfile() and member.name in expected and member.name not in seen
        assert member.size == expected[member.name]['bytes']
        assert hashlib.file_digest(archive.extractfile(member), 'sha256').hexdigest() == expected[member.name]['sha256']
        seen.add(member.name)
assert seen == set(expected)
for row in rows:
    state = Path(row['path']).stat()
    assert [state.st_dev, state.st_ino, state.st_size,
            state.st_mtime_ns, state.st_ctime_ns] == row['identity']
    assert digest(Path(row['path'])) == row['sha256']
result = dict(schema='complete-closed-proof-source-origin-v1', recordingHead=head,
    archive=str(target), bytes=target.stat().st_size, sha256=digest(target), members=rows,
    completeImmutablePredecessors=True, completeMemberReadbackVerified=True,
    originalReceivingCasesPerEngine=2, originalNodeReceivingAuditPassed=True,
    earlierDownstreamNodeDeadlineFailures=[126171.594837, 65304.007968],
    currentNodeCompletedAssertions=14, currentNodeWholeFilesCompleted=False,
    currentNodeUnitHeapAbort=True, currentNodeOriginalProofHistoryMs=56918.631864,
    currentNodeCompletedCaseDurationBreaches=0, currentNodeUnitInspectorDiagnostic=True,
    currentBunCompletedAssertions=18, currentBunWholeFilesCompleted=False,
    currentBunUnitMemoryGuardStopped=True, currentBunOriginalProofHistoryMs=59357.91,
    closedReceivingDataPackets=len(data_files), performanceComparisonQualified=False,
    productionExecutableGain=0, fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(result, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() < 500_000_000
print(json.dumps(dict(archive=str(target), bytes=result['bytes'], sha256=result['sha256'],
                     wholeMembers=len(seen), allocationBytes=allocation())))
