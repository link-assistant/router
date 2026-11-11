"""Retain complete closed receiving and CI observations without artifact copies."""
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
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def allocation():
    return sum(path.stat().st_size for parent in ['ci-logs', 'docs/case-studies/issue-784',
               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
               for path in Path(parent).rglob('*') if path.is_file() and not path.is_symlink()
               and 'toolchain' not in path.parts and '__pycache__' not in path.parts)


def retain(name, selected, predecessors, observations):
    target = evidence / (name + '.tar.gz')
    receipt = evidence / (name + '.json.gz')
    assert not target.exists() and not receipt.exists()
    selected = sorted(set(selected))
    rows = []
    for path in selected:
        assert path.is_file() and not path.is_symlink()
        state = path.stat()
        rows.append(dict(path=str(path), bytes=state.st_size, sha256=digest(path),
                         identity=[state.st_dev, state.st_ino, state.st_size,
                                   state.st_mtime_ns, state.st_ctime_ns]))
    # Even an incompressible complete capture must fit the fixed task cap.
    assert allocation() + sum(row['bytes'] for row in rows) + 1_000_000 < 500_000_000
    expected = {row['path']: row for row in rows}
    with target.open('xb') as output:
        with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode='w|') as archive:
                for row in rows:
                    archive.add(row['path'], arcname=row['path'], recursive=False)
                for path in predecessors:
                    body = subprocess.check_output(['git', 'show', head + ':' + str(path)])
                    name = 'baseline/' + head + '/' + str(path)
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
        path = Path(row['path'])
        state = path.stat()
        assert [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns] == row['identity']
        assert digest(path) == row['sha256']
    result = dict(schema='complete-closed-current-batch-v1', recordingHead=head,
                  archive=str(target), bytes=target.stat().st_size, sha256=digest(target),
                  members=rows, completeMemberReadbackVerified=True, **observations)
    encoded = json.dumps(result, separators=(',', ':')).encode()
    with receipt.open('xb') as output:
        output.write(gzip.compress(encoded, mtime=0))
    assert gzip.decompress(receipt.read_bytes()) == encoded
    assert allocation() < 500_000_000
    print(json.dumps(dict(archive=str(target), bytes=result['bytes'], sha256=result['sha256'],
                          completeMembers=len(seen), taskAllocationBytes=allocation())), flush=True)


selected = {Path('tools/translation/' + name + '.mjs') for name in [
    'concrete-canonical-meta-chunks', 'prepare-canonical-meta-chunks',
    'private-parser-canonical-meta-chunks', 'private-parser-execution',
    'concrete-syntax-meta', 'concrete-source-origin-phases']}
selected.update(Path(name) for name in [
    'tools/translation/test/concrete-canonical-meta-chunks.test.mjs',
    'tools/translation/test/complete-source-metadata-receiving.mjs',
    'tools/translation/test/complete-source-metadata-receiving.test.mjs',
    'tools/translation/test/source-lifetime-refusal-batches.test.mjs',
    'docs/case-studies/issue-784/current-canonical-meta-reader.md',
    'experiments/issue-784/current-authoring-source-origin-plan.md',
    'experiments/issue-784/retain-canonical-meta-and-terminal-ci.py'])
selected.update(path for path in base.iterdir() if path.is_file()
                and path.name.startswith('current-canonical-meta-'))
for path in list(selected):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name).resolve().relative_to(Path.cwd())
            assert directory.parent == Path('js/node_modules/.node-case-deadlines')
            selected.update(child for child in directory.iterdir() if child.is_file())
retain('current-canonical-meta-reader', selected,
       [Path('tools/translation/test/complete-source-metadata-receiving.mjs')],
       dict(nodeReceivingCases=8, nodeReceivingAuditPassed=True, bunReceivingCases=8,
            generationPassed=True, freshnessPassed=True, downstreamNodeAssertionsPassed=12,
            downstreamNodeAuditPassed=False, downstreamNodeDeadlineBreaches=1,
            downstreamBunCompleted=False, downstreamBunMemoryGuardStopped=True,
            separateBunHelperCases=6, performanceQualified=False,
            productionExecutableGain=0, fullGatePassed=False, runtimeParity=False,
            rustExecuted=False))

logs = json.loads((base / 'current-f93-completed-logs-10.json').read_bytes())
collection = json.loads((base / 'current-f93-terminal-artifact-collection.json').read_bytes())
assert logs['completeCycleCollected'] and collection['terminalSnapshotComplete']
assert len(logs['records']) == 30 and len(collection['records']) == 42
selected = {Path(row['log']) for row in logs['records']}
selected.update(Path(row['receipt']) for row in collection['records'])
selected.update(path for path in base.iterdir() if path.is_file() and (
    path.name in ['current-f93-completed-logs-10.json', 'current-f93-collector-10.log',
                  'current-f93-run-snapshot-10.json', 'current-f93-job-snapshot-10.json',
                  'current-f93-job-snapshot-10-normalized.json',
                  'current-f93-terminal-artifact-collection.json',
                  'checkpointf93-terminal-artifact-review.json.gz',
                  'checkpointf93-canonical-complete-decoded.json.gz']
    or path.name.startswith('current-f93-terminal-artifact-review.')))
selected.update(Path('experiments/issue-784/' + name + '.py') for name in [
    'collect-f93-artifacts', 'collect-f93-canonical-decoded', 'collect-f93-terminal-artifacts',
    'review-f93-artifacts-failed-v1', 'review-f93-early-artifacts',
    'review-f93-terminal-artifacts', 'report-f93-terminal', 'retain-canonical-meta-and-terminal-ci'])
selected.add(Path('docs/case-studies/issue-784/ci-f93-terminal-20261111.md'))
retain('current-f93-terminal-review', selected, [],
       dict(publishedHead='f93b01795a935317942adfe7d329f636dcd1848b', runId=42921384009,
            terminalJobs=75, nonpassingWholeLogs=30, wholeArtifactsReviewed=42,
            largeArtifactContainersIncluded=False, productionExecutableFunctions=162,
            productionFunctionCount=2578, productionCarriedFunctions=2416,
            installedHistoricalOutputsAsCurrent=False, fullGatePassed=False,
            runtimeParity=False, rustExecuted=False))
