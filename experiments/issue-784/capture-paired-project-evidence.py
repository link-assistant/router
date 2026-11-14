"""Preserve complete failed/passed runs and the full receiving source equation."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'


def census():
    size = 0
    for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                 'js/node_modules/.node-case-deadlines']:
        for parent, children, files in os.walk(name):
            if Path(parent) == Path('experiments/issue-784'):
                children[:] = [child for child in children if child != 'toolchain']
            size += sum((Path(parent) / item).stat().st_size for item in files
                        if not (Path(parent) / item).is_symlink())
    return size


if sys.argv[1:] == ['--typescript']:
    label = 'current-paired-project-typescript'
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped'] and receipt['interrupted'] is None
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    members = []
    for path in [base / (label + ext) for ext in ['.log', '.memory.json', '.observer.log']] + [
            Path(__file__), Path('experiments/issue-784/paired-project-accessor-plan.md'),
            Path('docs/case-studies/issue-784/current-paired-project-accessors.md')]:
        raw = path.read_bytes()
        members.append({'path': str(path.relative_to(root)) if path.is_absolute() else str(path),
                        'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                        'base64': base64.b64encode(raw).decode()})
    raw = json.dumps({'schema': 'complete-paired-project-typescript-evidence-v1',
                     'typescriptVersion': '5.9.3', 'scope': 'generated-draft tsconfig only',
                     'members': members, 'fullGateQualified': False}).encode() + b'\n'
    packed = gzip.compress(raw, mtime=0)
    assert census() + len(packed) < 500_000_000
    target = Path('docs/case-studies/issue-784/evidence/current-paired-project-typescript.json.gz')
    with target.open('xb') as stream:
        stream.write(packed)
    assert gzip.decompress(target.read_bytes()) == raw
    print(json.dumps({'path': str(target), 'bytes': len(packed),
                      'sha256': hashlib.sha256(packed).hexdigest(), 'censusAfterBytes': census()}))
    raise SystemExit(0)


target = Path('docs/case-studies/issue-784/evidence/current-paired-project.json.gz')
assert not target.exists()
paths, checks = set(), []
sha = lambda raw: hashlib.sha256(raw).hexdigest()
for suffix, expected in [('before-node', 1), ('node', 1), ('controls-node', 1),
                         ('controls-fixed-node', 0), ('bun', 0), ('source', 1),
                         ('source-after-retirement', 0)]:
    label = 'current-paired-project-' + suffix
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == expected and not receipt['stopped']
    assert receipt['interrupted'] is None and not receipt['stoppedOwnedProcessIds']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.update(base / (label + ext) for ext in ['.log', '.memory.json', '.observer.log'])
    audits = []
    for directory in re.findall(r'Complete Node deadline evidence: (\S+)',
                                (base / (label + '.log')).read_text()):
        path = Path(directory)
        assert path.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((path / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == expected and terminal['childClosed']
        assert terminal['groupCleanup']['complete'] and terminal['interrupted'] is None
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
        paths.update(item for item in path.iterdir() if item.is_file())
        audits.append({'path': directory, 'summary': terminal['auditSummary']})
    checks.append({'label': label, 'exitCode': expected, 'audits': audits,
                   'peakSampledCgroupBytes': receipt['peakSampledCgroupBytes']})
paths.update(base / name for name in [
    'current-paired-project-duplicate-retirement.json',
    'current-paired-project-duplicate-retirement.log',
    'current-paired-project-duplicate-retirement-fixed.log'])
sources = [
    'tools/translation/test/paired-project-accessor-fixture.mjs',
    'tools/translation/test/paired-project-accessor-fixture.test.mjs',
    'tools/translation/test/project-rule-pipeline.test.mjs',
    'tools/translation/test/project-facade-retention.test.mjs',
    'tools/translation/fixtures/project-before-rule-pipeline-000151.mjs.txt',
    'tools/translation/project.mjs',
    'experiments/issue-784/capture-paired-project-source.mjs',
    'experiments/issue-784/capture-paired-project-evidence.py',
    'experiments/issue-784/retire-recent-closed-raw-duplicates.py',
    'experiments/issue-784/paired-project-accessor-plan.md',
    'experiments/issue-784/run-observed-check.py',
]
paths.update(root / name for name in sources)
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': sha(raw), 'base64': base64.b64encode(raw).decode()})
commit = subprocess.check_output(['git', 'rev-parse', '262a338c522bcadce2955acdc2ed93bc7e90b752'], text=True).strip()
for path in sources[2:6]:
    raw = subprocess.check_output(['git', 'show', commit + ':' + path])
    members.append({'path': 'git:' + commit + ':' + path, 'bytes': len(raw),
                    'sha256': sha(raw), 'base64': base64.b64encode(raw).decode()})
source = Path('docs/case-studies/issue-784/evidence/current-paired-project-source.json.gz')
packed = source.read_bytes()
assert sha(packed) == '4c936af816f1394a79b8f9774c2a5bd002534aab8f74c8ab7c9e2d4653d2cdd5'
decoded = gzip.decompress(packed)
plan = json.loads(decoded)['plan']
assert plan['before'] == Path(sources[4]).read_text()
assert plan['current'] == Path(sources[5]).read_text()
assert plan['equation']['inverse'] == plan['before']
assert plan['relocated']['inverse'] == plan['equation']['after']
assert plan['source'] == plan['relocated']['text']
assert plan['baselineScope'] == 'method-free-project-cases'
assert len(plan['nativeBindings']) == 2 and not plan['semanticAuthority']


packet = {'schema': 'complete-paired-project-evidence-v1', 'sourceBase': commit,
          'checks': checks, 'members': members,
          'external': [{'path': str(source), 'bytes': len(packed), 'sha256': sha(packed),
                        'decodedBytes': len(decoded), 'decodedSha256': sha(decoded)}],
          'allOriginalDeadlinesRetained': True, 'oneGreenCombinedNodeRun': False,
          'fullGateQualified': False, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
assert census() + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(member['base64'], validate=True)
    assert len(restored) == member['bytes'] and sha(restored) == member['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'sha256': sha(packed),
                  'completeMembers': len(members), 'completeExternalContainers': 1,
                  'censusAfterBytes': census(), 'fullGateQualified': False}))
