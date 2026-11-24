"""Retain whole receiving checks and the exact one-import fixture repair."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
target = root / 'docs/case-studies/issue-784/evidence/current-descriptor-kind-receiving.json.gz'
assert not target.exists()
paths, checks = set(), []
for engine in ['node', 'bun']:
    label = 'current-descriptor-kind-' + engine
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert receipt['interrupted'] is None and not receipt['stoppedOwnedProcessIds']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.update(base / (label + ext) for ext in ['.log', '.memory.json', '.observer.log'])
    audits = []
    for directory in re.findall(r'Complete Node deadline evidence: (\S+)', (base / (label + '.log')).read_text()):
        folder = Path(directory)
        assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == 0 and terminal['childClosed']
        assert terminal['groupCleanup']['complete'] and terminal['interrupted'] is None
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        assert terminal['allCaseLimitsUnchanged']
        assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
        paths.update(path for path in folder.iterdir() if path.is_file())
        audits.append({'path': str(folder.relative_to(root)), 'summary': terminal['auditSummary']})
    checks.append({'label': label, 'receipt': receipt, 'audits': audits})
test = 'tools/translation/test/private-native-proof-descriptor-kind.test.mjs'
original = subprocess.check_output(['git', 'show', '68c598bc2:' + test])
assert Path(test).read_bytes() == original.replace(b'original-lexing-intrinsics.mjs', b'guarded-proof-lexing-intrinsics.mjs')
assert original.count(b'original-lexing-intrinsics.mjs') == 1
paths.update(root / path for path in [test,
    'tools/translation/private-native-proof-json.mjs',
    'experiments/issue-784/capture-descriptor-kind-evidence.py',
    'experiments/issue-784/descriptor-kind-receiving-plan.md',
    'docs/case-studies/issue-784/current-descriptor-kind-receiving.md'])
paths.add(base / 'current-descriptor-kind-versions.json')
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
record = {'schema': 'complete-descriptor-kind-receiving-evidence-v1', 'checks': checks,
          'originalTestGitReference': '68c598bc2:' + test,
          'originalTestBase64': base64.b64encode(original).decode(), 'members': members,
          'nodeCasesPassed': 8, 'bunCasesPassed': 8, 'originalDeadlinesRetained': True,
          'ciPinnedBunQualified': False, 'fullGatePassed': False,
          'newExecutableApplicationFunctions': 0, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
size = 0
for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784', 'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(name):
        if Path(parent) == Path('experiments/issue-784'):
            children[:] = [child for child in children if child != 'toolchain']
        size += sum((Path(parent) / name).stat().st_size for name in files if not (Path(parent) / name).is_symlink())
assert size + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(member['base64'], validate=True)
    assert len(restored) == member['bytes'] and hashlib.sha256(restored).hexdigest() == member['sha256']
print(json.dumps({'path': str(target.relative_to(root)), 'bytes': len(packed),
                  'sha256': hashlib.sha256(packed).hexdigest(), 'members': len(members),
                  'censusAfterBytes': size + len(packed)}))
