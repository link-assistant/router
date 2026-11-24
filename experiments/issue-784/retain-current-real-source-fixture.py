"""Retain complete receiving originals, including both full vector streams."""
from pathlib import Path
import base64
import gzip
import hashlib
import json
import os
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = [Path('tools/translation/prepare-real-source-fixtures.mjs'),
         Path('tools/translation/test/real-source-fixtures.mjs'),
         Path('tools/translation/test/real-source-fixtures.test.mjs'),
         Path('tools/translation/test/complete-core-source-fixture.mjs'),
         Path('experiments/issue-784/refresh-current-real-source-fixture.mjs'),
         base / 'current-real-source-fixture-proposal.json.xz',
         base / 'current-real-source-fixture-refresh-first-script.mjs.gz']
for name in ['current-real-source-fixture-refresh',
             'current-real-source-fixture-refresh-complete',
             'current-real-source-fixture-node', 'current-real-source-fixture-bun']:
    paths.extend(path for path in sorted(base.glob(name + '.*')) if path.is_file())
for engine in ['node', 'bun']:
    receipt = json.loads((base / ('current-real-source-fixture-' + engine + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert not Path('/proc', str(receipt['pid'])).exists()
    vectors = sorted((base / ('current-real-source-fixture-' + engine + '-vectors')).glob('*.json.gz'))
    assert len(vectors) == 8
    paths.extend(vectors)
audit = Path('js/node_modules/.node-case-deadlines/complete-ZJv18R')
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['exitCode'] == 0 and terminal['childClosed'] and terminal['groupCleanup']['complete']
paths.extend(path for path in sorted(audit.rglob('*')) if path.is_file())
paths.extend(path for path in sorted(Path('tools/translation/source-profiles/real-source-fixtures').iterdir()) if path.is_file())
paths.append(Path(__file__))
members = []
for path in dict.fromkeys(paths):
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                    'contentBase64': base64.b64encode(raw).decode()})
record = {'schema': 'complete-current-real-source-fixture-receiving-v1',
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
          'dirtyDraftSourcesIncludedInFull': True, 'nodeCases': 8, 'bunCases': 8,
          'nodeOriginalDeadlineAuditPassed': True, 'originalCaseLimitsUnchanged': True,
          'originalFrozenHistoryPreserved': True,
          'firstProducerExtensionFailedAtOriginal64SourceLimit': True,
          'firstExtensionWithdrawn': True,
          'scope': 'Complete receiving file only. No application function gain, full-gate, parity or Rust qualification.',
          'fullGatePassed': False, 'runtimeParity': False, 'rustExecuted': False, 'members': members}
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500000000
target = Path('docs/case-studies/issue-784/evidence/current-real-source-fixture-receiving.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['contentBase64'], validate=True)
    assert len(decoded) == member['bytes'] and hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'allCompleteOriginalBytesVerified': True, 'nodeCases': 8, 'bunCases': 8}))
