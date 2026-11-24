"""Preserve complete before/after receiving runs and their independent audits."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
archive = Path('docs/case-studies/issue-784/evidence/current-schemars-candidate-composition.tar.gz')
receipt = archive.with_name('current-schemars-candidate-composition.json.gz')
assert not archive.exists() and not receipt.exists()
paths = set(base.glob('current-schemars-candidate-*.log'))
paths.update(base.glob('current-schemars-candidate-*.memory.json'))
paths.update(Path('js/node_modules/.node-case-deadlines', name, entry)
             for name in ['complete-V9DPwu', 'complete-fJH3Dc']
             for entry in ['terminal.json', 'case-deadlines.json', 'request.json',
                           'command.json', 'stderr.raw.log', 'stdout.raw.tap'])
paths.update(Path(p) for p in [
    'experiments/issue-784/schemars-candidate-byte-scope-before.test.mjs.txt',
    'tools/translation/test/schemars-candidate-byte-scope.test.mjs',
    'tools/translation/test/clone-enclosing-source-history.test.mjs',
    'tools/translation/source-profiles/clone-enclosing/source-rules.json',
    'tools/translation/prepare-schemars-with-output.mjs',
    'tools/translation/compiler-source-inputs.mjs',
    'tools/translation/prepare-isolated-project-compiler.mjs'])
paths.add(Path(__file__).relative_to(root))
paths = sorted(paths)
assert len(paths) == 26 and sum(p.stat().st_size for p in paths) < 2_000_000


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid()
    return [info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns]


rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p),
             identity=identity(p)) for p in paths]
resources = {name: json.loads((base / ('current-schemars-candidate-' + name + '.memory.json')).read_bytes())
             for name in ['before', 'node', 'bun']}
assert resources['before']['exitCode'] == 1
assert all(resources[name]['exitCode'] == 0 for name in ['node', 'bun'])
assert all(not value['stopped'] and not Path('/proc', str(value['pid'])).exists()
           for value in resources.values())
audits = {}
for name in ['complete-V9DPwu', 'complete-fJH3Dc']:
    directory = Path('js/node_modules/.node-case-deadlines', name)
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    audit = json.loads((directory / 'case-deadlines.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert audit['passed'] and not audit['durationBreaches'] and not audit['errors']
    audits[name] = dict(terminal=terminal, audit=audit)
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
seen, expected = set(), {row['path']: row for row in rows}
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
assert all(identity(path) == row['identity'] and digest(path) == row['sha256']
           for path, row in zip(paths, rows))
record = dict(schema='schemars-candidate-composition-receiving-v1',
              parentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, resources=resources, audits=audits,
              rawCopiesRetired=False, fullGatePassed=False, runtimeParity=False,
              productionExecutableGainClaimed=0, rustExecuted=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256', 'parentHead']}))
print(json.dumps(dict(completeMembers=len(rows), nodeCases=6, bunCases=6,
                     independentDeadlineAudits=2, fullGatePassed=False)))
