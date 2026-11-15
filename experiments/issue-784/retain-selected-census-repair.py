"""Preserve complete selected-Git historical source and receiving observations."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

baseline = '567e1dd0b072a2bfd736a9025ba245a630aaff7d'
base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-selected-census-repair.json.gz')
members, receipts = [], {}


def retain(path, raw):
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})


for name in ['prepare-selected-git-census.mjs', 'prepare-real-source-fixtures.mjs',
             'strict-static-source-producer.mjs', 'test/selected-git-size-records.test.mjs']:
    path = Path('tools/translation') / name
    retain('git:' + baseline + ':' + str(path),
           subprocess.check_output(['git', 'show', baseline + ':' + str(path)]))
    retain(path, path.read_bytes())
for label in ['history', 'write', 'node', 'bun', 'check']:
    prefix = base / ('current-selected-census-' + label)
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = Path(str(prefix) + suffix)
        retain(path, path.read_bytes())
    receipt = json.loads(Path(str(prefix) + '.memory.json').read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    receipts[label] = receipt
for path in sorted(base.glob('current-selected-census-history-*')):
    retain(path, path.read_bytes())
for path in sorted(base.glob('current-selected-census-preflight-pages.*')):
    retain(path, path.read_bytes())
node_log = (base / 'current-selected-census-node.log').read_text()
audits = [line.removeprefix('Complete Node deadline evidence: ')
          for line in node_log.splitlines() if line.startswith('Complete Node deadline evidence: ')]
assert len(audits) == 1
audit = Path(audits[0])
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary']['passed'] and terminal['exitCode'] == 0
for path in sorted(audit.rglob('*')):
    if path.is_file():
        retain(path, path.read_bytes())
for path in [Path(__file__), Path('experiments/issue-784/probe-selected-census-history.mjs')]:
    retain(path, path.read_bytes())
record = {'schema': 'complete-selected-census-history-repair-v1',
          'baseline': baseline, 'members': members, 'receipts': receipts,
          'nodeAudit': terminal, 'nodeVersion': '20.20.2', 'bunVersion': '1.4.4',
          'ciBunVersion': '1.4.3', 'typescriptVersion': '5.9.3',
          'completeNodeCases': 5, 'completeBunCases': 5,
          'originalAssertionsAndDeadlinesRetained': True,
          'completeUnknownSourceStillRefused': True,
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
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'fullReadbackVerified': True, 'evidenceBytesAfter': total + len(packed)}))
