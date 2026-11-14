"""Preserve the complete failing and passing ASCII receiving runs."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
target = root / 'docs/case-studies/issue-784/evidence/current-ascii-selection-checks.json.gz'
assert not target.exists()
paths, checks = set(), []
for label, expected in [('current-ascii-circular-before-node', 1),
                        ('current-ascii-circular-after-node', 0),
                        ('current-ascii-circular-after-bun', 0),
                        ('current-ascii-selection-source', 0)]:
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == expected and not receipt['stopped']
    assert receipt['interrupted'] is None and not receipt['stoppedOwnedProcessIds']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.update(base / (label + ext) for ext in ['.log', '.memory.json', '.observer.log'])
    audits = []
    for directory in re.findall(r'Complete Node deadline evidence: (\S+)', (base / (label + '.log')).read_text()):
        folder = Path(directory)
        assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == expected and terminal['childClosed']
        assert terminal['groupCleanup']['complete'] and terminal['interrupted'] is None
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        assert terminal['allCaseLimitsUnchanged']
        assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
        paths.update(path for path in folder.iterdir() if path.is_file())
        audits.append({'path': str(folder.relative_to(root)), 'summary': terminal['auditSummary']})
    checks.append({'label': label, 'expectedExitCode': expected, 'receipt': receipt, 'audits': audits})
paths.update(base / name for name in ['current-ascii-historical-assets-capture.json',
    'current-ascii-selection-duplicate-retirement.json', 'current-ascii-selection-duplicate-retirement.log'])
paths.update(root / path for path in ['tools/translation/test/ascii-asset-historical-outputs.mjs',
    'tools/translation/test/current-unicode-ascii-asset-producers.test.mjs',
    'experiments/issue-784/capture-ascii-historical-assets.py',
    'experiments/issue-784/capture-ascii-selection-evidence.py',
    'experiments/issue-784/current-ascii-evidence-plan.md',
    'docs/case-studies/issue-784/current-ascii-selection.md'])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(), 'base64': base64.b64encode(raw).decode()})
external = []
for path in [root / 'docs/case-studies/issue-784/evidence/current-ascii-selection-source.json.gz',
             root / 'tools/translation/test/fixtures/ascii-asset-historical-outputs.json.gz']:
    packed = path.read_bytes()
    decoded = gzip.decompress(packed)
    json.loads(decoded)
    external.append({'path': str(path.relative_to(root)), 'bytes': len(packed),
                     'sha256': hashlib.sha256(packed).hexdigest(), 'decodedBytes': len(decoded),
                     'decodedSha256': hashlib.sha256(decoded).hexdigest(), 'wholeReadbackVerified': True})
record = {'schema': 'complete-ascii-selection-receiving-checks-v1', 'checks': checks,
          'members': members, 'external': external, 'nodeCasesPassedAfter': 3, 'bunCasesPassedAfter': 3,
          'beforeCasesPassed': 2, 'beforeCasesFailed': 1, 'allOriginalDeadlinesRetained': True,
          'routerCoreMatchesWholeFileQualified': False, 'fullGatePassed': False,
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
