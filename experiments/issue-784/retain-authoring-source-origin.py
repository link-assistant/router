"""Retain complete closed authoring attempts, including failed deadlines."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-authoring-source-origin.tar.gz')
receipt = target.with_name('current-authoring-source-origin.json.gz')
assert not target.exists() and not receipt.exists()
changed = [Path('tools/translation/' + name + '.mjs') for name in [
    'prepare-native-regeneration-batch', 'prepare-project-facade-retention',
    'prepare-project-source-origin-cst', 'prepare-runtime-import-current-sources',
    'prepare-runtime-import-phased-data']]
selected = set(changed)
selected.update(Path('tools/translation/test/' + name + '.test.mjs') for name in [
    'concrete-source-origin-phases', 'project-source-origin-cst', 'project-facade-retention',
    'project-progress-source-history', 'runtime-import-phased-data', 'router-core-vectors',
    'source-lifetime-refusal-batches', 'executable-checked-source',
    'core-adoption-progress', 'project-method-owner-scope'])
selected.update(Path(name) for name in [
    'experiments/issue-784/check-authoring-source-origin-bun.py',
    'experiments/issue-784/sample-active-source-lifetime.mjs',
    'experiments/issue-784/retain-authoring-source-origin.py',
    'experiments/issue-784/current-authoring-source-origin-plan.md',
    'docs/case-studies/issue-784/current-authoring-source-origin.md'])
selected.update(path for path in base.iterdir() if path.is_file()
    and path.name.startswith(('current-authoring-source-origin-', 'current-source-lifetime-active-sample'))
    and not path.name.startswith('current-authoring-source-origin-retention'))
for path in list(selected):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name).resolve().relative_to(Path.cwd())
            assert directory.parent == Path('js/node_modules/.node-case-deadlines')
            selected.update(child for child in directory.iterdir() if child.is_file())

def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

def identity(path):
    state = path.stat()
    return [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]

rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path), identity=identity(path))
        for path in sorted(selected)]
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
predecessors = {str(path): subprocess.check_output(['git', 'show', head + ':' + str(path)])
                for path in changed}
expected = {row['path']: row for row in rows}
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as archive:
            for row in rows:
                archive.add(row['path'], arcname=row['path'], recursive=False)
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
    assert identity(Path(row['path'])) == row['identity'] and digest(Path(row['path'])) == row['sha256']
record = dict(schema='complete-authoring-source-origin-receiving-v1', recordingHead=head,
    archive=str(target), bytes=target.stat().st_size, sha256=digest(target), members=rows,
    completeMemberReadbackVerified=True, nodeReceivingCases=21, nodeReceivingAuditPassed=True,
    bunReceivingCases=21, downstreamAssertionsPassed=28, downstreamAuditPassed=False,
    downstreamDeadlineBreaches=3, downstreamInspectorSampleAttached=True,
    performanceQualified=False, productionExecutableGain=0, fullGatePassed=False,
    runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(target), bytes=record['bytes'], sha256=record['sha256'], members=len(seen))))
