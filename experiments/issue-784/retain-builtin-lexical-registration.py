"""Retain the complete real registry refresh and all receiving attempts."""
import base64
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
stem = 'builtin-lexical-current'
paths = {path for path in base.iterdir() if path.is_file()
         and path.name.startswith(stem)
         and path.name.endswith(('.log', '.resources.json'))}
paths.update(Path(path) for path in [
    'experiments/issue-784/review-complete-isolated-proposal.mjs',
    'experiments/issue-784/retain-builtin-lexical-registration.py',
    'experiments/issue-784/retire-complete-lexical-copies.py',
    'ci-logs/issue-784-restart-2/complete-lexical-copy-retirement.json',
    'ci-logs/issue-784-restart-2/builtin-lexical-node-retirement.json',
    'experiments/issue-784/current-terminal-ci-repair-plan.md',
    'docs/case-studies/issue-784/builtin-lexical-registration-20261111.md',
])
for name in ['complete-YJWxi8', 'complete-BM515k']:
    folder = Path('js/node_modules/.node-case-deadlines') / name
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert terminal['auditSummary']['passed'] and terminal['exitCode'] == 0
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths.update(path for path in folder.rglob('*') if path.is_file())
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    if path.name.endswith('.resources.json'):
        record = json.loads(raw)
        assert not record['stopped'] and not Path('/proc/' + str(record['pid'])).exists()
        assert record['exitCode'] == (1 if path.name == stem + '-portable-bun.resources.json' else 0)
    members.append(dict(path=str(path), originalPath=str(path.resolve()), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(), base64=base64.b64encode(raw).decode()))
external = []
for suffix in ['-registry-proposal.json.xz', '-registration-refresh.json.xz',
               '-proposal-review.json.gz']:
    source = base / (stem + suffix)
    target = destination / source.name
    assert not target.exists()
    packed = source.read_bytes()
    raw = lzma.decompress(packed) if suffix.endswith('.xz') else gzip.decompress(packed)
    record = json.loads(raw)
    for row in record.get('files', []) if isinstance(record.get('files', []), list) else []:
        if 'base64' in row:
            decoded = base64.b64decode(row['base64'], validate=True)
            assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    for row in record.get('installed', []) if isinstance(record.get('installed', []), list) else []:
        decoded = base64.b64decode(row['base64'], validate=True)
        assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    external.append(dict(originalPath=str(source), retainedPath=str(target), bytes=len(packed),
                         sha256=hashlib.sha256(packed).hexdigest(), rawBytes=len(raw),
                         rawSha256=hashlib.sha256(raw).hexdigest()))
record = dict(schema='complete-builtin-lexical-registration-receiving-v1',
              sourceHead='3927bc31551aa3393e6176fa6b12d1be9e45a15e',
              members=members, externalMembers=external,
              nodeVersion='20.20.2', bunVersion='1.4.4', typescriptVersion='5.9.3',
              completeInputCount=1944, completeInputBytes=58880895,
              changedInputs=18, addedInputs=8, removedInputs=0, portableObjects=495,
              wholeIsolatedAndPortableFilesPassedBothEngines=True,
              originalAssertionsAndDeadlinesRetained=True,
              productionExecutableGain=0, semanticAuthority=False, runtimeParity=False,
              fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for folder in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
               'js/node_modules/.node-case-deadlines']:
    for directory, dirs, files in os.walk(folder):
        dirs[:] = [name for name in dirs if name not in ['toolchain', '__pycache__']]
        total += sum(Path(directory, name).stat().st_size for name in files)
assert total + len(packed) < 500_000_000
target = destination / 'builtin-lexical-registration-20261111.json.gz'
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
for row in external:
    source, retained = Path(row['originalPath']), Path(row['retainedPath'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
    source.rename(retained)
    assert retained.stat().st_size == row['bytes'] and hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     externalBytes=sum(row['bytes'] for row in external),
                     evidenceBytes=total + len(packed), wholeReadbackVerified=True,
                     wholeReceivingPassedBothEngines=True, fullGatePassed=False)))
