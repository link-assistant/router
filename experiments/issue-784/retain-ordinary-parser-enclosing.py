"""Retain complete source proposals, rejected drafts and whole receiving files."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ordinary-parser-enclosing-20261110.tar.gz')
receipt = target.with_name('ordinary-parser-enclosing-20261110.json.gz')
assert not target.exists() and not receipt.exists()
sha = lambda raw: hashlib.sha256(raw).hexdigest()
plan = json.loads(gzip.decompress((base / 'ordinary-parser-enclosing-complete-proposal.json.gz').read_bytes()))
assert plan['typescriptVersion'] == '5.9.3' and len(plan['files']) == 1
row = plan['files'][0]
assert Path(row['path']).read_text() == row['after'] and row['inverse'] == row['before']
assert row['selection']['ordinaryParserEnclosing']['inverse'] == row['selection']['ingressBoundary']['after']
for stage in row['stages']:
    assert stage['completeInverse']
    assert json.loads(stage['beforeMeta'])['source'] == stage['before']
    assert json.loads(stage['afterMeta'])['source'] == stage['after']
assert row['nativeBindings']['unboundIdentifiers'] == []
bun = json.loads(gzip.decompress((base / 'ordinary-parser-enclosing-bun.json.gz').read_bytes()))
assert bun['passed'] and bun['selectedInputsUnchanged'] and not bun['unrun']
assert sum(len(row['measuredCases']) for row in bun['results']) == 33

paths = set()
for pattern in ['ordinary-enclosing-*', 'ordinary-parser-enclosing-*',
                'csv-current-enclosing-*-refreshed*', 'csv-current-ordinary-config-parser*']:
    paths.update(path for path in base.glob(pattern) if path.is_file())
paths.update(Path(row['path']) for row in bun['selectedInputsAfter'])
paths.update(Path('experiments/issue-784') / name for name in [
    'author-ordinary-enclosing-source.py', 'author-ordinary-parser-enclosing-source.py',
    'revise-ordinary-enclosing-draft.py', 'install-ordinary-enclosing-proposal.mjs',
    'run-ordinary-enclosing-bun.py', 'probe-original-csv-frontier.mjs',
    'probe-csv-enclosing-owners.mjs', 'verify-original-csv-frontier.mjs',
])
paths.update(Path(name) for name in [
    __file__, 'docs/case-studies/issue-784/ordinary-parser-enclosing-20261110.md',
    'docs/case-studies/issue-784/csv-enclosing-frontier.md',
    'changelog.d/20261110_123500_preserve_ordinary_parser_enclosing_names.md',
])
audits = []
for path in sorted(paths):
    if path.suffix != '.log':
        continue
    for name in re.findall(r'^Complete Node deadline evidence: (.+)$', path.read_text(), re.M):
        directory = Path(name)
        assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
        terminal = json.loads((directory / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        paths.update(directory.iterdir())
        audit = json.loads((directory / 'case-deadlines.json').read_bytes())
        audits.append(dict(path=str(directory), passed=audit['passed'],
                           completed=audit['observedCompletedCases'],
                           breaches=audit['durationBreaches']))
final_audit = next(row for row in audits if row['path'].endswith('complete-WvahoY'))
assert final_audit['passed'] and final_audit['completed'] == 33 and not final_audit['breaches']
paths = sorted({path.resolve().relative_to(Path.cwd()) for path in paths})
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink() and path.stat().st_size < 64 * 1024 * 1024
    with path.open('rb') as source:
        members.append(dict(path=str(path), bytes=path.stat().st_size,
                            sha256=hashlib.file_digest(source, 'sha256').hexdigest()))
assert len(members) < 180 and sum(row['bytes'] for row in members) < 64 * 1024 * 1024
total = 0
for directory in ['ci-logs', 'docs/case-studies/issue-784',
                  'experiments/issue-784', 'js/node_modules/.node-case-deadlines']:
    for parent, dirs, files in os.walk(directory):
        dirs[:] = [name for name in dirs if name != '__pycache__' and not
                   (parent == 'experiments/issue-784' and name == 'toolchain')]
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + sum(row['bytes'] for row in members) + 1048576 < 500000000
with target.open('xb') as raw:
    with gzip.GzipFile(filename='', fileobj=raw, mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as archive:
            for member in members:
                archive.add(member['path'], arcname=member['path'], recursive=False)
with tarfile.open(target, 'r|gz') as archive:
    for expected, actual in zip(members, archive, strict=True):
        assert actual.isfile() and actual.name == expected['path'] and actual.size == expected['bytes']
        with archive.extractfile(actual) as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == expected['sha256']
record = dict(schema='complete-ordinary-parser-enclosing-receiving-v1',
              sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(target), bytes=target.stat().st_size,
              sha256=sha(target.read_bytes()), members=members, audits=audits,
              completeMemberStreamsReadBack=True, nodeCases=33, bunCases=33,
              originalDeadlinesUnchanged=True, publicBindingContractPreserved=True,
              fullOriginalCsvReceivingQualified=False, newlyExecutableProductionFunctions=0,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
data = (json.dumps(record, separators=(',', ':')) + '\n').encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(data, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == data
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256', 'nodeCases', 'bunCases']}))
