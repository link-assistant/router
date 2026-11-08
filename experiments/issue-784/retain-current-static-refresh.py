"""Preserve all refresh attempts and the full proposal without copying its archive."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
dest = Path('docs/case-studies/issue-784/evidence')
proposal = base / 'current-static-fixture-refresh-v3.json.gz'
value = json.loads(gzip.decompress(proposal.read_bytes()))
assert value['head'] == 'f2b67cb79eab228a33813bcbd7f45c5eaed8856a'
assert value['review']['historicalOccurrences'] == 1614
assert value['review']['historicalSourceBytesUnchanged']
for row in value['proposal']['files']:
    raw = Path(row['path']).read_bytes()
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
paths = [base / (prefix + suffix) for prefix in [
    'current-static-fixture-refresh', 'current-static-fixture-refresh-v2',
    'current-static-fixture-refresh-v3', 'current-refreshed-static-lifecycle-node',
] for suffix in ['.log', '.memory.json', '.observer.log']]
paths += [base / ('current-static-fixture-refresh-attempt-' + str(i) + '-source.mjs.gz') for i in [1, 2]]
paths += [Path(p) for p in [
    'experiments/issue-784/refresh-current-static-fixture.mjs',
    'experiments/issue-784/current-static-fixture-refresh-plan.md',
    'experiments/issue-784/retain-current-static-refresh.py',
    'docs/case-studies/issue-784/current-static-source-refresh.md',
    'tools/translation/prepare-real-source-fixtures.mjs',
    'tools/translation/static-source-layout-storage.mjs',
]]
audit = root / 'js/node_modules/.node-case-deadlines/complete-lHBkyF'
paths += [p for p in audit.iterdir() if p.is_file()]
for prefix in ['current-static-fixture-refresh', 'current-static-fixture-refresh-v2',
               'current-static-fixture-refresh-v3', 'current-refreshed-static-lifecycle-node']:
    receipt = json.loads((base / (prefix + '.memory.json')).read_bytes())
    for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds']]:
        assert not Path('/proc/' + str(pid)).exists()
members = []
for path in sorted(set(paths)):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root) if path.is_absolute() else path),
                    'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
record = {'schema': 'complete-current-static-source-refresh-attempts-v1',
          'members': members,
          'proposal': {'path': str(dest / 'current-static-fixture-refresh-proposal.json.gz'),
                       'bytes': proposal.stat().st_size,
                       'sha256': hashlib.sha256(proposal.read_bytes()).hexdigest()},
          'originalGeneratedFiles': value['originalFiles'],
          'nodeWholeFileQualified': False, 'bunWholeFileRun': False,
          'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
size = 0
for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(name):
        if Path(parent) == Path('experiments/issue-784'):
            children[:] = [child for child in children if child != 'toolchain']
        size += sum((Path(parent) / path).stat().st_size for path in files
                    if not (Path(parent) / path).is_symlink())
assert size + len(packed) < 500_000_000, (size, len(packed))
target = dest / 'current-static-fixture-refresh-checks.json.gz'
assert not target.exists() and not Path(record['proposal']['path']).exists()
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
proposal.rename(record['proposal']['path'])
print(json.dumps({'checks': str(target), 'checksBytes': len(packed),
                  'checksSha256': hashlib.sha256(packed).hexdigest(),
                  'proposal': record['proposal'], 'members': len(members)}))
