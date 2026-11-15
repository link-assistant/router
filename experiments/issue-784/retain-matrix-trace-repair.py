"""Retain complete trace attempts and genuine source equations before checkpoint."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
digest = lambda value: hashlib.sha256(value).hexdigest()
paths = {p for p in base.glob('current-124-matrix*')
         if not p.name.endswith('-proposal.json.gz')}
paths.update(base.glob('matrix-repair-published-retirement*'))
paths.update([Path(__file__), Path('experiments/issue-784/prepare-matrix-trace-repair.mjs'),
    Path('experiments/issue-784/probe-matrix-trace-backpressure.mjs'),
    Path('experiments/issue-784/probe-matrix-trace-engine.mjs'),
    Path('experiments/issue-784/retire-matrix-repair-published-archives.py'),
    Path('experiments/issue-784/run-observed-check.py'),
    Path('experiments/issue-784/with-child-reaper.py'),
    base / 'current-124-job-130426613267.log.gz'])
paths.update(Path('tools/translation') / name for name in [
    'matrix-trace-writer.mjs', 'isolated-matrix-profile.mjs',
    'owned-field-isolated-matrix-profile.mjs', 'native-owned-field-isolated-matrix-profile.mjs',
    'test/matrix-trace-writer.test.mjs', 'test/isolated-matrix-trace.test.mjs'])
attempts = []
for receipt in sorted(base.glob('current-124-matrix*.resources.json')):
    resource = json.loads(receipt.read_bytes())
    assert not Path('/proc/' + str(resource['pid'])).exists()
    log = receipt.with_name(receipt.name.replace('.resources.json', '.log'))
    text = (log.read_text() if log.exists()
            else gzip.decompress(log.with_suffix('.log.gz').read_bytes()).decode())
    attempts.append(dict(receipt=str(receipt), resource=resource))
    for name in re.findall(r'Complete Node deadline evidence: ([^\n]+)', text):
        folder = Path(name)
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        paths.update(p for p in folder.rglob('*') if p.is_file())
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=digest(raw),
                        base64=base64.b64encode(raw).decode()))
external = []
for name in ['owned', 'native']:
    source = base / ('current-124-matrix-trace-' + name + '-proposal.json.gz')
    target = destination / source.name
    assert not target.exists()
    packed = source.read_bytes()
    raw = gzip.decompress(packed)
    assert len(raw) < 32 * 1024 * 1024
    record = json.loads(raw)
    rows = record['proposal']['files'] if name == 'owned' else record['files']
    assert len(rows) == (9 if name == 'owned' else 7)
    for row in rows:
        assert Path(row['path']).read_text() == row['text' if name == 'owned' else 'after']
        if name == 'native':
            assert row['before'] == row['inverse']
            assert digest(row['before'].encode()) == row['beforeSha256']
            assert digest(row['after'].encode()) == row['afterSha256']
    external.append(dict(originalPath=str(source), retainedPath=str(target), bytes=len(packed),
        sha256=digest(packed), rawBytes=len(raw), rawSha256=digest(raw)))
record = dict(schema='complete-matrix-trace-repair-v1',
    sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    workingTreeCapture=True, attempts=attempts, members=members, externalMembers=external,
    qualificationScope='Final retained harnesses; earlier failed harness versions are not reconstructed.',
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
target = destination / 'matrix-trace-repair-20261111.json.gz'
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and digest(decoded) == row['sha256']
for row in external:
    source, retained = Path(row['originalPath']), Path(row['retainedPath'])
    assert digest(source.read_bytes()) == row['sha256']
    source.rename(retained)
    packed = retained.read_bytes()
    assert len(packed) == row['bytes'] and digest(packed) == row['sha256']
    decoded = gzip.decompress(packed)
    assert len(decoded) == row['rawBytes'] and digest(decoded) == row['rawSha256']
print(json.dumps(dict(path=str(target), bytes=len(target.read_bytes()), members=len(members),
    evidenceBytes=total + len(target.read_bytes()), completeReadbackVerified=True,
    fullGatePassed=False, runtimeParity=False)))
