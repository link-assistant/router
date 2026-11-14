"""Inspect complete archived import routes without changing production discovery."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

packet = Path('docs/case-studies/issue-784/evidence/current-private-closure-census.json.gz')
assert packet.stat().st_size < 16 * 1024**2
record = json.loads(gzip.decompress(packet.read_bytes()))
member, = [row for row in record['members']
           if row['path'].endswith('/current-private-closure-census-2.json.gz')]
raw = base64.b64decode(member['base64'], validate=True)
assert len(raw) == member['bytes']
assert hashlib.sha256(raw).hexdigest() == member['sha256']
census = json.loads(gzip.decompress(raw))
modules = {row['id']: row for row in census['modules']}
assert len(modules) <= 512
assert sum(len(row['imports']) for row in modules.values()) <= 4096
roots = [*census['roots'], *('core-exposed:' + row['name'] for row in census['routes'])]
originals = {row['path']: row for row in census['originalSources']}


def reachable(exclude=None):
    seen, pending = set(), list(roots)
    while pending:
        current = pending.pop()
        if current == exclude or current in seen:
            continue
        seen.add(current)
        pending.extend(row['target'] for row in modules[current]['imports']
                       if row['target'] is not None)
    return seen


all_modules = reachable()
assert all_modules == set(modules)
rows = []
for name in modules:
    if name in roots:
        continue
    retained = reachable(name)
    retained_paths = {modules[item]['path'] for item in retained}
    absent = sorted(set(originals) - retained_paths)
    rows.append(dict(module=name, hypotheticalAbsentPaths=absent,
                     hypotheticalAbsentBytes=sum(originals[path]['bytes'] for path in absent),
                     productionRemovalAuthorized=False))
rows.sort(key=lambda row: (-row['hypotheticalAbsentBytes'], row['module']))
result = dict(schema='archived-complete-private-import-coupling-v1',
              originalInputCommit=record['originalInputCommit'], roots=roots,
              totals=census['totals'], rows=rows, currentSourceQualified=False,
              productionLimitChanged=False, productionSourceChanged=False,
              executableGain=0, runtimeParity=False, rustExecuted=False)
out = Path('ci-logs/issue-784-restart-2/current-private-import-coupling.json.gz')
encoded = json.dumps(result, separators=(',', ':')).encode()
with out.open('xb') as stream:
    stream.write(gzip.compress(encoded, mtime=0))
assert gzip.decompress(out.read_bytes()) == encoded
print(json.dumps(dict(path=str(out), totals=census['totals'],
                     largestCouplings=[{key: value for key, value in row.items()
                                        if key != 'hypotheticalAbsentPaths'} for row in rows[:15]],
                     currentSourceQualified=False)))
