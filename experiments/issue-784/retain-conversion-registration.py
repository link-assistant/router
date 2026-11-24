"""Retain actual fresh registration and whole resource-stopped receiving runs."""
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
members, external, runs = [], [], []


def retain(path):
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for label in ['current-source-origin-registry-proposal',
              'current-conversion-registry-proposal',
              'current-conversion-registration-install',
              'current-conversion-registration-node',
              'current-conversion-registration-bun']:
    for suffix in ['.log', '.memory.json']:
        retain(base / (label + suffix))
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    assert receipt['stopThresholdBytes'] == 2866933760
    runs.append(dict(label=label, receipt=receipt))
    for value in re.findall(r'Complete Node deadline evidence: (.+)',
                            (base / (label + '.log')).read_text()):
        folder = Path(value)
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        for path in sorted(folder.iterdir()):
            if path.is_file():
                retain(path)
for name in ['current-source-origin-registry-proposal.json.xz',
             'current-conversion-registry-proposal.json.xz',
             'current-conversion-registration-refresh.json.xz']:
    path, retained = base / name, destination / name
    assert path.is_file() and not retained.exists()
    packed = path.read_bytes()
    raw = lzma.decompress(packed)
    data = json.loads(raw)
    for row in data['files'] if isinstance(data.get('files'), list) else data['installed']:
        decoded = base64.b64decode(row['base64'], validate=True)
        assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
    external.append(dict(originalPath=str(path), retainedPath=str(retained),
                         bytes=len(packed), sha256=hashlib.sha256(packed).hexdigest(),
                         rawBytes=len(raw), rawSha256=hashlib.sha256(raw).hexdigest()))
for name in ['experiments/issue-784/retain-conversion-registration.py',
             'tools/translation/isolated-project-batch.mjs',
             'tools/translation/isolated-project-driver.mjs',
             'tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz',
             'tools/translation/source-profiles/isolated-project-compiler/history-fa86a6d0ddd4bdd827196fa88517d13b09c5a3ba.json.gz',
             'tools/translation/test/fixtures/portable-git/manifest.json',
             'tools/translation/test/fixtures/portable-git/objects.json.gz',
             'tools/translation/test/isolated-project-batch.test.mjs',
             'tools/translation/test/portable-git-fixtures.test.mjs']:
    retain(Path(name))
record = dict(schema='complete-conversion-registration-attempts-v1',
              sourceHead='58c6c0b430cdfaf500b5e530440f18ada55f49f6',
              members=members, externalMembers=external, runs=runs,
              inputs=1824, sourceBytes=57920058, portableObjects=468,
              originalConcreteProfileUnchanged=True,
              originalAssertionsAndDeadlinesRetained=True,
              completeReceivingPassed=False, fullGatePassed=False,
              productionExecutableGain=0, runtimeParity=False, rustExecuted=False)
packed = gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        if parent == 'experiments/issue-784':
            directories[:] = [name for name in directories if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500000000
target = destination / 'current-conversion-registration.json.gz'
with target.open('xb') as output:
    output.write(packed)
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
for row in external:
    source, retained = Path(row['originalPath']), Path(row['retainedPath'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
    source.rename(retained)
    assert retained.stat().st_size == row['bytes'] and hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     wholeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
