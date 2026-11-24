"""Retain complete alias-reader checks, native source proposal and prior failure."""
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
target = Path('docs/case-studies/issue-784/evidence/current-alias-reader.json.gz')
assert not target.exists()
sha = lambda raw: hashlib.sha256(raw).hexdigest()
paths, checks = set(), []
for suffix in ['node', 'bun', 'source']:
    label = 'current-alias-reader-' + suffix
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert receipt['interrupted'] is None and not receipt['stoppedOwnedProcessIds']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.update(base / (label + ext) for ext in ['.log', '.memory.json', '.observer.log'])
    audits = []
    for directory in re.findall(r'Complete Node deadline evidence: (\S+)',
                                (base / (label + '.log')).read_text()):
        path = Path(directory)
        assert path.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((path / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == 0 and terminal['childClosed']
        assert terminal['groupCleanup']['complete'] and terminal['interrupted'] is None
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
        paths.update(item for item in path.iterdir() if item.is_file())
        audits.append({'path': directory, 'summary': terminal['auditSummary']})
    checks.append({'label': label, 'exitCode': 0, 'audits': audits,
                   'peakSampledCgroupBytes': receipt['peakSampledCgroupBytes']})
paths.update(base / ('current-alias-reader-duplicate-retirement' + ext) for ext in ['.json', '.log'])
sources = [
    'tools/translation/prepare-compiler-alias-history.mjs',
    'tools/translation/compiler-alias-receiving-reader.mjs',
    'tools/translation/test/compiler-alias-receiving-reader.test.mjs',
    'tools/translation/test/source-producer-freshness.test.mjs',
    'tools/translation/test/current-proof-cost-source-history.mjs',
    'tools/translation/test/current-proof-cost-source-history.test.mjs',
    'tools/translation/test/private-native-proof-cost-scope.test.mjs',
    'experiments/issue-784/capture-alias-reader-source.mjs',
    'experiments/issue-784/capture-alias-reader-evidence.py',
    'experiments/issue-784/retire-recent-closed-raw-duplicates.py',
    'experiments/issue-784/compiler-alias-reader-plan.md',
    'experiments/issue-784/owned-field-prerequisite-plan.md',
    'experiments/issue-784/run-observed-check.py',
    'docs/case-studies/issue-784/current-alias-reader.md',
]
paths.update(root / name for name in sources)
for name in sources[3:7]:
    assert Path(name).read_bytes() == subprocess.check_output(['git', 'show', '95460607f:' + name])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': sha(raw), 'base64': base64.b64encode(raw).decode()})
external = []
for name, digest in [
        ('current-class-birth-entry', 'f629b40fc1d9216f252ec5867ec593ad1bde29a6fcdd241a3827f21a9b7842d4'),
        ('current-alias-reader-source', '68aee658b3bb3664a14ce71f4650f279dc62c63035b00a5db8f1d39b9d6e230a')]:
    path = Path('docs/case-studies/issue-784/evidence/' + name + '.json.gz')
    packed = path.read_bytes()
    assert sha(packed) == digest
    raw = gzip.decompress(packed)
    parsed = json.loads(raw)
    if name.endswith('source'):
        assert len(parsed['nativeBindings']) == 6 and parsed['typescriptVersion'] == '5.9.3'
        assert all(row['nativeSemanticScopeChecked'] for row in parsed['nativeBindings'])
        assert all(row['inverse'] == row['before'] for row in parsed['equations'])
        for row in parsed['files']:
            assert Path(row['path']).read_text() == row['after']
        plan = parsed['plan']
        assert len(plan['records']) == 6 and len(plan['files']) == 1
        assert len(plan['receivingReaders']) == 1
        assert not plan['sourceAuthority'] and not plan['runtimeAuthority']
        assert plan['files'][0]['before'] == plan['files'][0]['after']
    else:
        assert packed == subprocess.check_output(['git', 'show', '95460607f:' + str(path)])
        assert next(row for row in parsed['checks'] if row['label'].endswith('after-node'))['exitCode'] == 1
    external.append({'path': str(path), 'bytes': len(packed), 'sha256': digest,
                     'decodedBytes': len(raw), 'decodedSha256': sha(raw)})
packet = {'schema': 'complete-alias-reader-evidence-v1', 'checks': checks,
          'members': members, 'external': external, 'typescriptVersion': '5.9.3',
          'nodeCasesPassed': 21, 'bunCasesPassed': 21, 'strictTypecheck': False,
          'allOriginalDeadlinesRetained': True, 'fullGateQualified': False,
          'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)


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


assert census() + len(packed) < 500_000_000
with target.open('xb') as stream:
    stream.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(member['base64'], validate=True)
    assert len(restored) == member['bytes'] and sha(restored) == member['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'sha256': sha(packed),
                  'completeMembers': len(members), 'completeExternalContainers': len(external),
                  'censusAfterBytes': census(), 'fullGateQualified': False}))
