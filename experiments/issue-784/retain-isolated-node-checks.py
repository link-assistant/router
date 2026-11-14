"""Retain complete focused checks and the unsuccessful production deadline."""
import gzip
import hashlib
import json
from pathlib import Path
import tarfile

base = Path('ci-logs/issue-784-restart-2')
paths = {*base.glob('isolated-node-workflow*'), *base.glob('isolated-node-runtime-import-complete*')}
paths.update(Path('js/node_modules/.node-case-deadlines/complete-aqIUW3').iterdir())
paths.update(Path(name) for name in [
    '.github/workflows/javascript-first.yml',
    'scripts/check-js-first-workflows.mjs', 'scripts/prepare-matrix-draft-workflow.mjs',
    'scripts/fixed-nine-draft-policy.mjs', 'scripts/ci/fixed-nine-draft-workflow-sources.json.gz',
    'scripts/run-node-test-shard.mjs', 'scripts/run-node-tests.mjs',
    'scripts/test/check-js-first-workflows.test.mjs', 'scripts/test/run-node-test-shard.test.mjs',
    'tools/translation/js-to-rust/test/runtime-import-parents.test.mjs',
    'tools/translation/prepare-owned-runtime-import-current.mjs',
])
resources = [json.loads((base / (name + '.memory.json')).read_bytes()) for name in [
    'isolated-node-workflow-complete-tests', 'isolated-node-runtime-import-complete']]
assert [row['exitCode'] for row in resources] == [0, 1]
assert all(not row['stopped'] and not Path('/proc/' + str(row['pid'])).exists() for row in resources)
audit = json.loads(Path('js/node_modules/.node-case-deadlines/complete-aqIUW3/case-deadlines.json').read_bytes())
assert not audit['passed'] and audit['durationBreaches'] == 1
assert audit['observedCompletedCases'] == 7 and len(audit['errors']) == 1
equations = json.loads(gzip.decompress((base / 'isolated-node-workflow-source-equations.json.gz').read_bytes()))
assert equations['before'] == equations['inverse'] and equations['after'] == equations['current']
assert [row['phase'] for row in equations['stages']] == ['language', 'repository']
members = []
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink()
    with path.open('rb') as source:
        members.append(dict(path=str(path), bytes=path.stat().st_size,
                            sha256=hashlib.file_digest(source, 'sha256').hexdigest()))
target = Path('docs/case-studies/issue-784/evidence/isolated-node-translation-checks.tar.gz')
assert not target.exists()
with tarfile.open(target, 'x:gz') as archive:
    for row in members:
        archive.add(row['path'], arcname=row['path'], recursive=False)
expected, seen = {row['path']: row for row in members}, set()
with tarfile.open(target, 'r|gz') as archive:
    for member in archive:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(archive.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
with target.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
record = dict(schema='complete-isolated-node-focused-checks-v1', archive=str(target),
    bytes=target.stat().st_size, sha256=digest, members=members, resources=resources,
    workflowAndRunnerCases=45, workflowAndRunnerPassed=True, completeRuntimeCases=7,
    completeRuntimeAssertionsPassed=True, completeRuntimeDeadlineQualified=False,
    originalDeadlinesPreserved=True, currentFullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
receipt = target.with_name('isolated-node-translation-checks.json.gz')
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(target), bytes=record['bytes'], sha256=digest,
    members=len(members), workflowAndRunnerPassed=True, completeRuntimeDeadlineQualified=False)))
