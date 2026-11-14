"""Retain the complete unqualified helper draft before withdrawing it."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
folder = Path('js/node_modules/.node-case-deadlines/complete-IFQjqI')
terminal = json.loads((folder / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary']['durationBreaches'] == 3
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
paths = {path for path in folder.rglob('*') if path.is_file()}
paths |= {path for path in base.glob('current-shared-source-*') if path.is_file()}
helpers = ['ascii-source-composition.mjs',
           'owned-core-private-analysis-source-composition.mjs',
           'runtime-import-source-composition.mjs']
paths |= {Path('tools/translation/test') / name for name in helpers}
paths |= {Path(__file__), Path('experiments/issue-784/profile-current-ascii-process.mjs')}
members = []
def append(name, raw):
    members.append({'path': str(name), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
for path in sorted(paths):
    append(path, path.read_bytes())
for name in helpers:
    path = 'tools/translation/test/' + name
    append('git:8e8de4dfb:' + path,
           subprocess.check_output(['git', 'show', '8e8de4dfb:' + path]))
record = {'schema': 'complete-withdrawn-shared-source-receiving-v1',
          'sourceHead': '8e8de4dfb', 'members': members,
          'wholeFiles': terminal['allSelectedWholeFiles'],
          'behavioralCasesPassed': 9, 'durationBreaches': 3,
          'deadlineQualified': False, 'draftWithdrawn': True,
          'optionalFullVectorLoggingEnabled': False,
          'bunDraftReceiving': 'unrun',
          'cpuProfilerStarted': False,
          'cpuProfilerRefusal': 'Target had already exited before its command could be read; no signal sent.',
          'productionExecutableGain': 0, 'runtimeParity': False,
          'fullGatePassed': False, 'rustExecuted': False}
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
target = Path('docs/case-studies/issue-784/evidence/current-shared-source-receiving-withdrawal.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'censusAfterBytes': total + len(packed), 'deadlineQualified': False}))
