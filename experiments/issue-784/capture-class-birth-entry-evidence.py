"""Retain complete failed/passed class runs and both actual source proposals."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
target = Path('docs/case-studies/issue-784/evidence/current-class-birth-entry.json.gz')
assert not target.exists()
sha = lambda raw: hashlib.sha256(raw).hexdigest()
paths, checks = set(), []
for suffix, expected in [('before-node', 1), ('entry-source', 0), ('program-source', 1),
                         ('program-source-v2', 0), ('after-node', 1), ('after-bun', 0)]:
    label = 'current-class-birth-' + suffix
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
for name in ['current-class-birth', 'current-class-birth-receiving']:
    paths.update(base / (name + '-duplicate-retirement' + ext) for ext in ['.json', '.log'])
sources = [
    'tools/translation/test/original-class-definition-birth.test.mjs',
    'tools/translation/test/source-producer-freshness.test.mjs',
    'tools/translation/prepare-class-birth-entry.mjs',
    'tools/translation/class-program-storage.mjs',
    'experiments/issue-784/capture-class-birth-entry-source.mjs',
    'experiments/issue-784/capture-class-birth-entry-evidence.py',
    'experiments/issue-784/retire-recent-closed-raw-duplicates.py',
    'experiments/issue-784/class-birth-entry-plan.md',
    'experiments/issue-784/run-observed-check.py',
    'docs/case-studies/issue-784/current-class-birth-entry.md',
]
paths.update(root / name for name in sources)
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': sha(raw), 'base64': base64.b64encode(raw).decode()})
external = []
for name, digest in [
        ('current-class-birth-entry-source', '6ec39486b3fcf13683923e3362fee42a7238d8e844f3c71682244a2436bd1e16'),
        ('current-class-birth-program-source', '7917dcae04185292f7f8fe427a0ff7c5f0fddfc51be9ef5dec412573dce784b9')]:
    path = Path('docs/case-studies/issue-784/evidence/' + name + '.json.gz')
    packed = path.read_bytes()
    assert sha(packed) == digest
    raw = gzip.decompress(packed)
    plan = json.loads(raw)['plan']
    if name.endswith('entry-source'):
        assert plan['inverse'] == plan['before']
        assert Path(plan['path']).read_text() == plan['after']
        assert Path(plan['entry']['path']).read_text() == plan['entry']['source']
    else:
        assert len(plan['files']) == 13 and len(plan['selections']) == 24
        old = json.loads(plan['leaf']['storage']['beforeProgramJson'])
        old['entry']['sourcePin'] = plan['program']['entry']['sourcePin']
        assert old == plan['program']
        assert Path(plan['leaf']['path']).read_text() == plan['leaf']['afterSource']
        for row in plan['files']:
            assert Path('tools/translation', row['path']).read_text() == row['afterSource']
    external.append({'path': str(path), 'bytes': len(packed), 'sha256': digest,
                     'decodedBytes': len(raw), 'decodedSha256': sha(raw)})
packet = {'schema': 'complete-class-birth-entry-evidence-v1', 'checks': checks,
          'members': members, 'external': external, 'typescriptVersion': '5.9.3',
          'remainingFreshnessFailures': ['compiler-alias-proof-cost-reader-composition'],
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
