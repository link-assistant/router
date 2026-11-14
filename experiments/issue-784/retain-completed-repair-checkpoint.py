"""Retain the complete stopped gate and reviewed checkpoint inputs."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == '8255c55f78b245c8eea355ffca7e18bb765a6b2c'
receipt = json.loads((base / 'current-completed-repair-full-gate.memory.json').read_bytes())
assert receipt['exitCode'] == 143 and receipt['stopped']
for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds']]:
    assert not Path('/proc/' + str(pid)).exists()
assert gzip.decompress((base / 'current-completed-repair-full-gate.log.gz').read_bytes()) == b''
paths = sorted(base.glob('current-completed-repair-*'))
paths += sorted(base.glob('current-repair-final-*'))
paths += [base / 'current-repair-syntax.log',
          Path('experiments/issue-784/retain-completed-repair-checkpoint.py')]
members = []
for path in paths:
    assert path.is_file()
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
record = {'schema': 'complete-stopped-current-repair-gate-v1',
          'testedHead': head, 'members': members, 'receipt': receipt,
          'nodeVersion': '20.20.2', 'nodeHeapMiB': 512,
          'pathPrefix': str(Path.cwd() / 'experiments/issue-784/toolchain/node20/bin'),
          'nodeOptions': '--max-old-space-size=512',
          'gateStageOutputBytes': 0, 'initialFingerprintCompleted': False,
          'unrunStages': ['lint', 'node-tests', 'bun-tests', 'typescript',
                          'parity', 'translation', 'reverse-translation'],
          'greenStampWritten': False, 'fullGatePassed': False, 'rustExecuted': False,
          'sourceReview': 'The complete 450-line local source patch was reviewed; GitHub diff API refused HTTP 406 above 300 files.',
          'fetchedMain': subprocess.check_output(['git', 'rev-parse', 'origin/main'], text=True).strip(),
          'mainIsAncestor': True, 'priorPublishedHead': '10fd7f0da82df707f90b16eb892e8e520f699654'}
subprocess.run(['git', 'merge-base', '--is-ancestor', 'origin/main', 'HEAD'], check=True)
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
target = Path('docs/case-studies/issue-784/evidence/current-completed-repair-gate.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed),
                  'sha256': hashlib.sha256(packed).hexdigest(),
                  'members': len(members), 'censusAfterBytes': size + len(packed)}))
