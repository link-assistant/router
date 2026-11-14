"""Preserve complete registration receiving attempts and original source joins."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
paths = set()
for label in ['current-after-ascii-registry-proposal',
              'current-after-ascii-registration-refresh',
              'current-after-ascii-isolated-node', 'current-after-ascii-isolated-bun',
              'current-after-ascii-portable-node', 'current-after-ascii-portable-bun']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        paths.add(base / (label + suffix))
for name in ['complete-BpeEkI', 'complete-GlGX6N']:
    folder = Path('js/node_modules/.node-case-deadlines') / name
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert terminal['auditSummary']['passed'] and terminal['exitCode'] == 0
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths |= {path for path in folder.rglob('*') if path.is_file()}
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    if path.name.endswith('.memory.json'):
        receipt = json.loads(raw)
        assert receipt['exitCode'] == 0 and not receipt['stopped']
        assert not Path('/proc/' + str(receipt['pid'])).exists()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
external = []
for name in ['current-after-ascii-registry-proposal.json.xz',
             'current-after-ascii-registration-refresh.json.xz']:
    path = base / name
    external.append({'path': str(path), 'bytes': path.stat().st_size,
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
record = {'schema': 'complete-current-registration-receiving-v1',
          'sourceHead': 'ce7e1df8d36317d7540fa874df7e6c64b2e6b0a0',
          'members': members, 'externalMembers': external,
          'nodeVersion': '20.20.2', 'bunVersion': '1.4.4', 'typescriptVersion': '5.9.3',
          'wholeIsolatedAndPortableFilesPassedBothEngines': True,
          'originalAssertionsAndDeadlinesRetained': True,
          'productionExecutableGain': 0, 'semanticAuthority': False,
          'runtimeParity': False, 'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, names in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in names
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-registration-receiving.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'members': len(members), 'bytes': len(packed),
                  'wholeReceivingPassedBothEngines': True, 'fullGatePassed': False}))
