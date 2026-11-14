"""Retain complete finite observations, including the failed whole deadline."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/runtime-stream-20261110.tar.gz')
receipt_path = target.with_name('runtime-stream-20261110.json.gz')
assert not target.exists() and not receipt_path.exists()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def task_bytes():
    total = 0
    for directory in ['ci-logs', 'docs/case-studies/issue-784',
                      'experiments/issue-784', 'js/node_modules/.node-case-deadlines']:
        for parent, directories, files in os.walk(directory):
            directories[:] = [name for name in directories
                              if name != '__pycache__' and not
                              (parent == 'experiments/issue-784' and name == 'toolchain')]
            total += sum((Path(parent) / name).stat().st_size for name in files
                         if not (Path(parent) / name).is_symlink())
    return total


head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
plan_path = base / 'runtime-stream-source-equation.log'
plan = json.loads(plan_path.read_bytes())
evolution = plan['runtimeEvolution']
assert evolution['before'] != evolution['after'] == plan['after']
for key in ['equation', 'previousEquation']:
    equation = plan[key]
    assert equation['inverse'] == equation['before']
    assert equation['after'] == plan['after']
    assert [stage['phase'] for stage in equation['stages']] == ['language', 'repository']
    for stage in equation['stages']:
        assert stage['inverse'] == stage['before']
        assert json.loads(stage['beforeMeta'])['source'] == stage['before']
        assert json.loads(stage['afterMeta'])['source'] == stage['after']
assert Path(plan['path']).read_text() == plan['after']

cst = {}
for size in [64, 32]:
    path = base / ('current-cst-packing-32-' + str(size) + '.jsonl.gz')
    observed = {}
    with gzip.open(path, 'rt') as source:
        for line in source:
            assert len(line) <= 64 * 1024 * 1024
            row = json.loads(line)
            if 'path' not in row:
                continue
            assert row['path'] not in observed
            wire = row['concreteSyntax']['meta']
            assert json.loads(wire)['source'] == row['source']
            assert Path(row['path']).read_text() == row['source']
            observed[row['path']] = hashlib.sha256(wire.encode()).hexdigest()
    assert len(observed) == 60
    cst[size] = observed
assert cst[64] == cst[32]

observed = set()
with gzip.open(base / 'native-runtime-stream-complete.jsonl.gz', 'rt') as source:
    for line in source:
        assert len(line) <= 64 * 1024 * 1024
        row = json.loads(line)
        if 'path' not in row:
            continue
        assert row['path'] not in observed
        assert hashlib.sha256(row['canonical'].encode()).hexdigest() == row['digest']
        assert Path(row['path']).read_text() == row['source']
        assert Path(row['targetPath']).read_text() == row['typed']
        observed.add(row['path'])
assert observed == set(cst[64])

paths = set()
for pattern in ['runtime-stream-*', 'native-runtime-stream-complete*',
                'current-cst-packing-32*']:
    paths.update(path for path in base.glob(pattern) if path.is_file())
paths.add(plan_path)
for name in ['native-typescript.mjs', 'native-runtime-identity.mjs',
             'test/native-typescript.test.mjs', 'test/native-runtime-identity.test.mjs',
             'test/native-regeneration-batch.test.mjs']:
    paths.add(Path('tools/translation/js-to-rust') / name)
paths.update(Path(name) for name in [
    'tools/translation/prepare-native-regeneration-batch.mjs',
    'tools/translation/source-profiles/native-regeneration-runtime-stream/source-rules.json',
    'experiments/issue-784/compare-native-runtime-stream.mjs',
    'experiments/issue-784/compare-production-cst-packing.mjs',
    'experiments/issue-784/profile-native-typescript-regeneration.mjs',
    'experiments/issue-784/inspect-native-regeneration-profile.py',
    'docs/case-studies/issue-784/runtime-stream-20261110.md',
    'changelog.d/20261110_120000_stream_native_runtime_identity.md',
    __file__,
])
attempts = []
for path in list(paths):
    if path.suffix != '.log':
        continue
    for matched in re.findall(r'^Complete Node deadline evidence: (.+)$', path.read_text(), re.M):
        directory = Path(matched)
        assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
        terminal = json.loads((directory / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        paths.update(directory.iterdir())
        attempts.append(str(directory))
assert len(set(attempts)) == 2
paths = {path.resolve().relative_to(Path.cwd()) for path in paths}
rows = []
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink() and path.stat().st_size <= 64 * 1024 * 1024
    rows.append(dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path)))
assert len(rows) < 128 and sum(row['bytes'] for row in rows) < 64 * 1024 * 1024
assert task_bytes() + sum(row['bytes'] for row in rows) + 1048576 < 500000000
with target.open('xb') as raw:
    with gzip.GzipFile(filename='', fileobj=raw, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as archive:
            for row in rows:
                path = Path(row['path'])
                assert digest(path) == row['sha256'] and path.stat().st_size == row['bytes']
                archive.add(path, arcname=str(path), recursive=False)
with tarfile.open(target, 'r|gz') as archive:
    for row, member in zip(rows, archive, strict=True):
        assert member.isfile() and member.name == row['path'] and member.size == row['bytes']
        with archive.extractfile(member) as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == head
record = dict(schema='complete-runtime-stream-observations-v1', sourceHead=head,
              members=rows, archive=str(target), archiveBytes=target.stat().st_size,
              archiveSha256=digest(target), allOriginalMemberStreamsReadBack=True,
              completeProductionModules=60, completeCstWiresEqual=True,
              canonicalRuntimeDigestsEqual=True,
              wholeNativeTypeScriptCases=9, tapPasses=9,
              originalRegenerationDeadlineMs=60000, observedRegenerationMs=100583.599341,
              independentDeadlineAuditPassed=False, wholeAttemptExitCode=1,
              controlledSpeedup=False, fullGatePassed=False,
              newlyExecutableProductionFunctions=0, rustExecuted=False)
raw = json.dumps(record).encode()
with receipt_path.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt_path.read_bytes()) == raw and task_bytes() < 500000000
print(json.dumps(dict(archive=str(target), bytes=record['archiveBytes'],
                      sha256=record['archiveSha256'], members=len(rows),
                      taskEvidenceBytes=task_bytes(), independentDeadlineAuditPassed=False)))
