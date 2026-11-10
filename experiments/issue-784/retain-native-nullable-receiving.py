"""Retain whole nullable before/after runs, including unsuccessful drafts."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
archive = Path('docs/case-studies/issue-784/evidence/current-native-nullable-receiving.tar.gz')
receipt = archive.with_name('current-native-nullable-receiving.json.gz')
assert not archive.exists() and not receipt.exists()
labels = ['before-bun', 'after-bun', 'batch-bun', 'phase-bun', 'node',
          'final-bun', 'es2022-bun', 'es2022-node']
paths = set(base.glob('current-native-nullable-*.log'))
paths.update(base.glob('current-native-nullable-*.memory.json'))
audits = {}
for name in ['complete-SeY59N', 'complete-rbtkSs']:
    directory = Path('js/node_modules/.node-case-deadlines', name)
    entries = ['terminal.json', 'case-deadlines.json', 'request.json',
               'command.json', 'stderr.raw.log', 'stdout.raw.tap']
    paths.update(directory / entry for entry in entries)
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    audit = json.loads((directory / 'case-deadlines.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert audit['passed'] and not audit['durationBreaches'] and not audit['errors']
    audits[name] = dict(terminal=terminal, audit=audit)
paths.update(Path(p) for p in [
    'experiments/issue-784/native-nullable-before.test.mjs.txt',
    'tools/translation/js-to-rust/test/native-nullable.test.mjs',
    'tools/translation/js-to-rust/translator.mjs',
    'tools/translation/js-to-rust/concrete-source.mjs',
    'tools/translation/js-to-rust/native-typescript.mjs',
    *['js/src/' + name + '.mjs' for name in ['client-status', 'oauth', 'usage', 'admin']],
    'js/package-lock.json', 'js/package.json'])
paths.add(Path(__file__).relative_to(Path.cwd()))
paths = sorted(paths)
assert sum(p.stat().st_size for p in paths) < 4_000_000


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid()
    return [info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns]


resources = {label: json.loads((base / ('current-native-nullable-' + label + '.memory.json')).read_bytes())
             for label in labels}
assert all(resources[label]['exitCode'] == 1
           for label in ['before-bun', 'after-bun', 'batch-bun', 'final-bun'])
assert all(resources[label]['exitCode'] == 0
           for label in ['phase-bun', 'node', 'es2022-bun', 'es2022-node'])
assert all(not value['stopped'] and not Path('/proc', str(value['pid'])).exists()
           for value in resources.values())
rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p), identity=identity(p)) for p in paths]
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
compiler = Path('js/node_modules/typescript/lib/typescript.js')
record = dict(schema='native-nullable-whole-receiving-v1',
              parentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, resources=resources, audits=audits,
              compiler=dict(version='5.9.3', path=str(compiler), bytes=compiler.stat().st_size, sha256=digest(compiler)),
              originalBunDeadlineMs=5000, strict=True, libraryChecking=True,
              fixtureLibraries=['lib.es2022.d.ts'], fullGatePassed=False,
              runtimeParity=False, productionExecutableGainClaimed=0, rustExecuted=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256', 'parentHead']}))
print(json.dumps(dict(completeMembers=len(rows), nodeCases=5, bunCases=5,
                     independentDeadlineAudits=len(audits), unsuccessfulDraftsRetained=4)))
