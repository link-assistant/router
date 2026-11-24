"""Keep every receiving attempt for the second current compiler registration."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
paths = set()
labels = ['registry-proposal', 'registration-install', 'isolated-node',
          'isolated-bun', 'portable-node', 'portable-node-v2', 'portable-node-v3',
          'portable-bun', 'portable-bun-v2']
receipts = {}
for label in labels:
    prefix = base / ('current-after-fixtures-' + label)
    for suffix in ['.log', '.memory.json', '.observer.log']:
        paths.add(Path(str(prefix) + suffix))
    receipt = json.loads(Path(str(prefix) + '.memory.json').read_bytes())
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    receipts[label] = receipt
failed = ['portable-node', 'portable-node-v2', 'portable-bun']
assert all(receipts[label]['stopped'] and receipts[label]['exitCode'] != 0 for label in failed)
assert all(row['exitCode'] == 0 and not row['stopped']
           for label, row in receipts.items() if label not in failed)
for label in ['portable-preflight-pages', 'portable-v3-preflight-pages']:
    for suffix in ['.log', '.json.gz']:
        paths.add(base / ('current-after-fixtures-' + label + suffix))
for name in ['current-bun-test-resource-options.log', 'current-bun-runtime-resource-options.log']:
    paths.add(base / name)
audits = []
for label in ['isolated-node', 'portable-node', 'portable-node-v2', 'portable-node-v3']:
    log = (base / ('current-after-fixtures-' + label + '.log')).read_text()
    prefix = 'Complete Node deadline evidence: '
    names = [line[len(prefix):] for line in log.splitlines() if line.startswith(prefix)]
    assert len(names) == 1
    folder = Path(names[0])
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    passed = label not in failed
    assert (terminal['exitCode'] == 0) == passed
    if passed:
        assert terminal['auditSummary']['passed']
    audits.append({'label': label, 'directory': str(folder), 'qualified': passed})
    paths |= {path for path in folder.rglob('*') if path.is_file()}
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
external = []
for name in ['current-after-fixtures-registry-proposal.json.xz',
             'current-after-fixtures-registration-refresh.json.xz']:
    path = base / name
    external.append({'path': str(path), 'bytes': path.stat().st_size,
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
record = {'schema': 'complete-after-fixtures-registration-receiving-v1',
          'sourceHead': '82b7a8fcb2cde270b41925a14d0f48ecc2d0f7c8',
          'members': members, 'externalMembers': external, 'receipts': receipts,
          'audits': audits, 'nodeVersion': '20.20.2', 'bunVersion': '1.4.4',
          'typescriptVersion': '5.9.3', 'completePassingCasesAcrossBothEngines': 32,
          'wholeIsolatedAndPortableFilesPassedBothEngines': True,
          'earlierPortableNodeResourceStopRetained': True,
          'portableNodePassingParentHeapMiB': 384,
          'portableBunPassingRuntimeFlags': ['--smol'],
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
target = Path('docs/case-studies/issue-784/evidence/after-fixtures-registration-receiving.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'members': len(members), 'bytes': len(packed),
                  'wholeReceivingPassedBothEngines': True, 'fullGatePassed': False}))
