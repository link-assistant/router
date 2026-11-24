"""Retain the complete Default prerequisite history reproduction and successor verification."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
archive = Path('docs/case-studies/issue-784/evidence/current-default-prerequisite-history.tar.gz')
receipt = archive.with_name('current-default-prerequisite-history.json.gz')
assert not archive.exists() and not receipt.exists()
paths = set(base.glob('current-default-prerequisite-*.log'))
paths.update(base.glob('current-default-prerequisite-*.memory.json'))
audits = {}
for name in ['complete-aHwTty', 'complete-Qy0Gsf', 'complete-RxTgYz']:
    directory = Path('js/node_modules/.node-case-deadlines', name)
    paths.update(directory / entry for entry in ['terminal.json', 'case-deadlines.json',
                 'request.json', 'command.json', 'stderr.raw.log', 'stdout.raw.tap'])
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    audit = json.loads((directory / 'case-deadlines.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert audit['passed'] and not audit['durationBreaches'] and not audit['errors']
    audits[name] = dict(terminal=terminal, audit=audit)
paths.update(Path(p) for p in [
    'experiments/issue-784/default-proof-byte-prerequisites-before.test.mjs.txt',
    'experiments/issue-784/default-proof-byte-prerequisites-first-repair.test.mjs.txt',
    'tools/translation/test/default-proof-byte-prerequisites.test.mjs',
    'tools/translation/prepare-default-proof-byte-adoption.mjs',
    'tools/translation/operation-proof-byte-consumer-scope.mjs',
    'tools/translation/prepare-operation-proof-byte-sources.mjs',
    'tools/translation/operation-size-measurement-source.mjs',
    'tools/translation/operation-proof-byte-scope.mjs',
    'tools/translation/private-frozen-json.mjs',
    'tools/translation/prepare-guarded-proof-lexing.mjs',
    'tools/translation/concrete-sequential-phases.mjs'])
paths.add(Path(__file__).relative_to(Path.cwd()))
paths = sorted(paths)
assert sum(p.stat().st_size for p in paths) < 4_000_000


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


resources = {name: json.loads((base / ('current-default-prerequisite-' + name + '.memory.json')).read_bytes())
             for name in ['before-node', 'node', 'final-node', 'bun']}
assert resources['before-node']['exitCode'] == 1
assert resources['node']['exitCode'] == 1
assert resources['final-node']['exitCode'] == resources['bun']['exitCode'] == 0
assert all(not row['stopped'] and not Path('/proc', str(row['pid'])).exists()
           for row in resources.values())
rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p)) for p in paths]
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
assert all(p.stat().st_size == row['bytes'] and digest(p) == row['sha256']
           for p, row in zip(paths, rows))
record = dict(schema='default-prerequisite-history-whole-receiving-v1',
              parentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, resources=resources, audits=audits,
              historicalOutputPinPreserved=True, originalDeadlineMs=60000,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              productionExecutableGainClaimed=0)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256', 'parentHead']}))
print(json.dumps(dict(completeMembers=len(rows), nodeCases=3, bunCases=3,
                     independentDeadlineAudits=len(audits))))
