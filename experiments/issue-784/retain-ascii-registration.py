"""Retain actual registry proposals and whole receiving attempts, including failures."""
import base64
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path
import re

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
target = destination / 'current-ascii-registration.json.gz'
members, runs, external = [], [], []


def retain(path, raw):
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for label in ['current-ascii-registry-proposal', 'current-ascii-registration-refresh',
              'current-ascii-registration-node', 'current-ascii-registration-node-2',
              'current-ascii-registration-bun']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = base / (label + suffix)
        retain(path, path.read_bytes())
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    assert receipt['stopThresholdBytes'] == 2866933760
    runs.append(dict(label=label, receipt=receipt))
    for name in re.findall(r'^Complete Node deadline evidence: (.*)$',
                           (base / (label + '.log')).read_text(), re.M):
        folder = Path(name)
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        for path in sorted(folder.rglob('*')):
            if path.is_file():
                retain(path, path.read_bytes())

for name in ['current-ascii-registry-proposal.json.xz', 'current-ascii-registration-refresh.json.xz']:
    source, retained = base / name, destination / name
    assert source.is_file() and not retained.exists()
    packed = source.read_bytes()
    raw = lzma.decompress(packed)
    data = json.loads(raw)
    for row in data['files'] if 'files' in data and isinstance(data['files'], list) else data['installed']:
        decoded = base64.b64decode(row['base64'], validate=True)
        assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    external.append(dict(originalPath=str(source), retainedPath=str(retained),
                         bytes=len(packed), sha256=hashlib.sha256(packed).hexdigest(),
                         rawBytes=len(raw), rawSha256=hashlib.sha256(raw).hexdigest()))

for name in ['tools/translation/isolated-project-batch.mjs',
             'tools/translation/isolated-project-driver.mjs',
             'tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz',
             'tools/translation/source-profiles/isolated-project-compiler/history-ca0c519ccd0ee0f23bddfeb14d2f4b40a61e7cfa.json.gz',
             'tools/translation/test/fixtures/portable-git/manifest.json',
             'tools/translation/test/fixtures/portable-git/objects.json.gz',
             'tools/translation/test/isolated-project-batch.test.mjs',
             'tools/translation/test/portable-git-fixtures.test.mjs',
             'experiments/issue-784/retain-ascii-registration.py',
             str(base / 'current-ascii-registry-review.json')]:
    retain(name, Path(name).read_bytes())

raw = json.dumps(dict(schema='complete-ascii-registration-attempts-v1',
                     sourceHead='fa86a6d0ddd4bdd827196fa88517d13b09c5a3ba',
                     members=members, externalMembers=external, runs=runs,
                     inputs=1818, sourceBytes=57810256, portableObjects=468,
                     originalAssertionsAndDeadlinesRetained=True,
                     fullGatePassed=False, productionExecutableGain=0,
                     semanticAuthority=False, runtimeParity=False, rustExecuted=False),
                 separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        if parent == 'experiments/issue-784':
            directories[:] = [name for name in directories if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500000000
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
    assert retained.stat().st_size == row['bytes']
    assert hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                      completeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
