"""Retain the whole source-history reproduction and unchanged-deadline checks."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
archive = Path('docs/case-studies/issue-784/evidence/current-selected-census-source-history.tar.gz')
receipt = archive.with_name('current-selected-census-source-history.json.gz')
assert not archive.exists() and not receipt.exists()
paths = set(base.glob('current-selected-history-*.log'))
paths.update(base.glob('current-selected-history-*.memory.json'))
paths.add(base / 'current-selected-census-history-diff.log')
paths.update(Path('experiments/issue-784').glob('current-selected-history-*.txt'))
paths.add(Path('experiments/issue-784/inspect-selected-census-history.py'))
paths.add(Path(__file__).relative_to(Path.cwd()))
prefix = Path('tools/translation')
paths.update(prefix / p for p in ['prepare-selected-git-census.mjs',
    'test/selected-git-size-records.test.mjs', 'prepare-strict-static-source-producer.mjs',
    'prepare-real-source-fixtures.mjs', 'static-source-universe.mjs',
    'strict-static-source-producer.mjs', 'source-copy-native-bindings.mjs',
    'concrete-source-origin-phases.mjs', 'source-profiles/selected-git-census/complete-originals.json.gz'])
audits = {}
for name in ['complete-Vwjzm5', 'complete-SnVG7D', 'complete-VzM0Z1']:
    directory = Path('js/node_modules/.node-case-deadlines', name)
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    audit = json.loads((directory / 'case-deadlines.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert audit['passed'] == (name != 'complete-SnVG7D')
    assert audit['durationBreaches'] == (1 if name == 'complete-SnVG7D' else 0)
    audits[name] = dict(terminal=terminal, audit=audit)
    paths.update(p for p in directory.rglob('*') if p.is_file())
resources = {name: json.loads((base / ('current-selected-history-' + name + '.memory.json')).read_bytes())
             for name in ['before-node', 'node', 'batched-node', 'batched-bun']}
assert [r['exitCode'] for r in resources.values()] == [1, 1, 0, 0]
assert all(not r['stopped'] and not Path('/proc', str(r['pid'])).exists() for r in resources.values())


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in ['toolchain', '__pycache__']]
        total += sum((Path(parent) / p).stat().st_size for p in files
                     if not (Path(parent) / p).is_symlink())
paths = sorted(paths)
assert sum(p.stat().st_size for p in paths) < 4_000_000
assert total + 4_000_000 < 500_000_000
rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p)) for p in paths]
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
seen, expected = set(), {r['path']: r for r in rows}
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
assert all(p.stat().st_size == r['bytes'] and digest(p) == r['sha256'] for p, r in zip(paths, rows))
record = dict(schema='selected-census-complete-source-history-receiving-v1',
    parentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
    members=rows, resources=resources, audits=audits, nodeCases=5, bunCases=5,
    nodeVersion='20.20.2', bunVersion='1.4.4', ciBunVersion='1.4.3', typescriptVersion='5.9.3',
    originalDeadlineMs=60000, originalCasesPreserved=True,
    compressionCandidateInstalled=False, fullGatePassed=False, runtimeParity=False,
    rustExecuted=False, productionExecutableGainClaimed=0)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
    completeMembers=len(rows), evidenceBytesAfter=total+archive.stat().st_size+receipt.stat().st_size)))
