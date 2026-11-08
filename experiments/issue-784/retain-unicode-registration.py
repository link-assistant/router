"""Retain the complete current registration proposal, install and receiving checks."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence')
head = 'ca0c519ccd0ee0f23bddfeb14d2f4b40a61e7cfa'
members, receipts = [], {}


def member(path, raw):
    return {'path': str(path), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'base64': base64.b64encode(raw).decode()}


for label in ['registry-probe', 'registry-install', 'registration-node', 'registration-bun']:
    prefix = base / ('current-unicode-' + label)
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = Path(str(prefix) + suffix)
        members.append(member(path, path.read_bytes()))
    receipt = json.loads(Path(str(prefix) + '.memory.json').read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    receipts[label] = receipt
node_log = (base / 'current-unicode-registration-node.log').read_text()
audit = [line.removeprefix('Complete Node deadline evidence: ')
         for line in node_log.splitlines() if line.startswith('Complete Node deadline evidence: ')]
assert len(audit) == 1
folder = Path(audit[0])
terminal = json.loads((folder / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary']['passed'] and terminal['exitCode'] == 0
for path in sorted(folder.rglob('*')):
    if path.is_file():
        members.append(member(path, path.read_bytes()))
case = Path('tools/translation/test/portable-git-fixtures.test.mjs')
members.append(member('before/' + str(case), subprocess.check_output(['git', 'show', head + ':' + str(case)])))
members.append(member('after/' + str(case), case.read_bytes()))
external = []
for name in ['current-unicode-registry-proposal.json.xz', 'current-unicode-registration-refresh.json.xz']:
    source, destination = base / name, target / name
    assert source.is_file() and not destination.exists()
    raw = source.read_bytes()
    external.append({'originalPath': str(source), 'retainedPath': str(destination),
                     'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
record = {'schema': 'complete-unicode-registration-receiving-v1', 'sourceHead': head,
          'members': members, 'externalMembers': external, 'receipts': receipts,
          'nodeAudit': terminal, 'nodeVersion': '20.20.2', 'bunVersion': '1.4.4',
          'typescriptVersion': '5.9.3', 'nodeParentHeapMiB': 384,
          'bunFlags': ['--smol'], 'completeNodeCases': 16, 'completeBunCases': 16,
          'originalAssertionsAndDeadlinesRetained': True,
          'missingHeadUsesGenuineFixtureCommit': True, 'sourceInputs': 1817,
          'sourceBytes': 57801245, 'portableObjects': 468,
          'productionExecutableGain': 0, 'semanticAuthority': False,
          'runtimeParity': False, 'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
output = target / 'current-unicode-registration-receiving.json.gz'
with output.open('xb') as stream:
    stream.write(packed)
assert gzip.decompress(output.read_bytes()) == raw
for row in json.loads(gzip.decompress(output.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
for row in external:
    source, destination = Path(row['originalPath']), Path(row['retainedPath'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
    source.rename(destination)
    assert destination.stat().st_size == row['bytes']
    assert hashlib.sha256(destination.read_bytes()).hexdigest() == row['sha256']
print(json.dumps({'path': str(output), 'bytes': len(packed), 'members': len(members),
                  'wholeFilesBothEnginesPassed': True, 'fullGatePassed': False}))
