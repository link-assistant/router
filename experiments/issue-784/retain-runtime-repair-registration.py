"""Keep complete genuine registration and every whole-file receiving attempt."""
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
label = 'runtime-repair-current'
paths = {path for path in base.glob(label + '*')
         if path.name.endswith(('.log', '.resources.json', '-pages.json.gz'))}
paths.update([Path(__file__), Path('experiments/issue-784/probe-current-isolated-registry.mjs'),
              Path('experiments/issue-784/review-complete-isolated-proposal.mjs'),
              Path('experiments/issue-784/refresh-current-isolated-registration.mjs')])
attempts = []
for log in sorted(path for path in paths if path.suffix == '.log'):
    receipt = log.with_suffix('.resources.json')
    if not receipt.exists():
        continue
    resource = json.loads(receipt.read_bytes())
    assert not Path('/proc/' + str(resource['pid'])).exists()
    attempts.append(dict(log=str(log), resource=resource))
    for name in re.findall(r'Complete Node deadline evidence: ([^\n]+)', log.read_text()):
        folder = Path(name)
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        paths.update(path for path in folder.rglob('*') if path.is_file())
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
        sha256=hashlib.sha256(raw).hexdigest(), base64=base64.b64encode(raw).decode()))
external = []


def verify_complete_members(value):
    if isinstance(value, dict):
        if 'base64' in value:
            decoded = base64.b64decode(value['base64'], validate=True)
            assert len(decoded) == value['bytes']
            assert hashlib.sha256(decoded).hexdigest() == value['sha256']
        for child in value.values():
            if isinstance(child, (dict, list)):
                verify_complete_members(child)
    elif isinstance(value, list):
        for child in value:
            verify_complete_members(child)


for suffix in ['-registry-proposal.json.xz', '-registration-refresh.json.xz',
               '-proposal-review.json.gz']:
    source = base / (label + suffix)
    target = destination / source.name
    assert not target.exists()
    packed = source.read_bytes()
    raw = lzma.decompress(packed) if suffix.endswith('.xz') else gzip.decompress(packed)
    assert len(raw) < 32 * 1024 * 1024
    record = json.loads(raw)
    verify_complete_members(record)
    if suffix == '-registration-refresh.json.xz':
        for row in [*record['installed'], record['history']]:
            assert Path(row['path']).read_bytes() == base64.b64decode(row['base64'], validate=True)
    external.append(dict(originalPath=str(source), retainedPath=str(target), bytes=len(packed),
        sha256=hashlib.sha256(packed).hexdigest(), rawBytes=len(raw),
        rawSha256=hashlib.sha256(raw).hexdigest()))
    if suffix == '-proposal-review.json.gz':
        review = record
record = dict(schema='complete-runtime-repair-registration-receiving-v1',
    sourceHead=review['afterHead'], completeInputCount=review['files'],
    completeInputBytes=review['totalSourceBytes'], changed=review['changed'],
    added=review['added'], removed=review['removed'], attempts=attempts,
    members=members, externalMembers=external, productionExecutableGain=0,
    semanticAuthority=False, runtimeParity=False, fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for folder in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
               'js/node_modules/.node-case-deadlines']:
    for directory, dirs, files in os.walk(folder):
        dirs[:] = [name for name in dirs if name not in ['toolchain', '__pycache__']]
        total += sum(Path(directory, name).stat().st_size for name in files)
assert total + len(packed) < 500_000_000
target = destination / 'runtime-repair-registration-20261111.json.gz'
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
    evidenceBytes=total + len(packed), wholeReadbackVerified=True,
    fullGatePassed=False, runtimeParity=False)))
