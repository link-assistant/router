"""Preserve complete closed decoder checks and unchanged external diagnostics."""
import argparse
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='append', required=True)
args = parser.parse_args()
root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
directory = root / 'docs/case-studies/issue-784/evidence/original-decoder'
target = directory.parent / 'current-original-decoder.json.gz'
assert not directory.exists() and not target.exists()
digest = lambda raw: hashlib.sha256(raw).hexdigest()


def census():
    total = 0
    for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                 'js/node_modules/.node-case-deadlines']:
        for parent, children, files in os.walk(name):
            if Path(parent) == Path('experiments/issue-784'):
                children[:] = [child for child in children if child != 'toolchain']
            total += sum((Path(parent) / file).stat().st_size for file in files
                         if not (Path(parent) / file).is_symlink())
    return total


before = census()
assert before < 499_000_000
paths, checks = set(), []
for arg in args.check:
    label, code = arg.rsplit(':', 1)
    assert re.fullmatch('current-[a-z0-9-]+', label)
    code = int(code)
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == code and receipt['interrupted'] is None
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    assert all(not Path('/proc/' + str(pid)).exists()
               for pid in receipt['stoppedOwnedProcessIds'])
    paths.update(base / (label + suffix) for suffix in ['.log', '.memory.json', '.observer.log'])
    audits = []
    for name in re.findall(r'Complete Node deadline evidence: (\S+)',
                           (base / (label + '.log')).read_text()):
        path = Path(name)
        assert path.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((path / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == code and terminal['childClosed']
        assert terminal['groupCleanup']['complete']
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        if receipt['stopped']:
            assert terminal['interrupted'] == 'SIGTERM'
        else:
            assert terminal['interrupted'] is None
            if code == 0:
                assert terminal['auditSummary']['passed'] is True
                assert terminal['auditSummary']['durationBreaches'] == 0
        paths.update(item for item in path.iterdir() if item.is_file())
        audits.append({'directory': name, 'summary': terminal['auditSummary'],
                       'error': terminal['auditError'], 'interrupted': terminal['interrupted']})
    checks.append({'label': label, 'exitCode': code, 'resourceStopped': receipt['stopped'],
                   'audits': audits})

sources = [
    'tools/translation/private-output-text.mjs',
    'tools/translation/private-native-output-text.mjs',
    'tools/translation/test/private-output-text-decoder.test.mjs',
    'tools/translation/test/private-output-text.test.mjs',
    'tools/translation/test/native-output-text-retention.test.mjs',
    'tools/translation/test/current-native-output-text-retention.test.mjs',
    'tools/translation/test/owned-field-isolated-matrix-cli.test.mjs',
    'experiments/issue-784/probe-original-retention-decode.mjs',
    'experiments/issue-784/original-retention-decode-plan.md',
    'experiments/issue-784/profile-isolated-retention-worker.mjs',
    'experiments/issue-784/release-inactive-repository-pages.py',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/capture-original-decoder-evidence.py',
]
paths.update(root / name for name in sources)
paths.update(base / name for name in [
    'current-decoder-inactive-pages.json.gz', 'current-decoder-inactive-pages.log',
    'current-native-retention-worker-after-profile-summary.json',
    *['current-decoder-' + name + '.json' for name in [
        'issue', 'issue-comments', 'pr', 'inline-comments', 'pr-comments', 'pr-reviews']],
])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': digest(raw), 'base64': base64.b64encode(raw).decode()})
old_path = 'tools/translation/private-output-text.mjs'
commit = subprocess.check_output(['git', 'rev-parse', 'cbe928e11'], text=True).strip()
old = subprocess.check_output(['git', 'show', commit + ':' + old_path])
members.append({'path': 'git:' + commit + ':' + old_path, 'bytes': len(old),
                'sha256': digest(old), 'base64': base64.b64encode(old).decode()})

# Whole existing gzip containers move intact; no second diagnostic-sized copy.
directory.mkdir()
external = []
for name in ['current-original-decode-before.json.gz', 'current-original-decode-cells.json.gz',
             'current-native-retention-worker-after-profile.json.gz']:
    path = base / name
    state = path.stat()
    assert state.st_nlink == 1 and not path.is_symlink()
    packed = path.read_bytes()
    raw = gzip.decompress(packed)
    value = json.loads(raw)
    assert value['performanceQualified'] is False
    if name.startswith('current-original-decode-'):
        assert value['completePayloads'] == 827 and value['completeBytes'] == 4312290
        assert value['allFullPayloadsRestoredExactly'] is True
        expected_source = old if '-before.' in name else (root / old_path).read_bytes()
        assert value['source'].encode() == expected_source
        fixture = root / value['fixture']['path']
        fixture_packed = fixture.read_bytes()
        fixture_raw = gzip.decompress(fixture_packed)
        assert len(fixture_packed) == value['fixture']['bytes']
        assert digest(fixture_packed) == value['fixture']['sha256']
        assert len(fixture_raw) == value['fixture']['decodedBytes']
        assert digest(fixture_raw) == value['fixture']['decodedSha256']
    else:
        assert value['status'] == 0 and value['error'] is None and value['signal'] is None
        assert value['variant'] == 'native' and len(value['profiles']) == 1
        assert json.loads(value['profiles'][0]['source'])['nodes']
    destination = directory / name
    path.rename(destination)
    assert destination.stat().st_ino == state.st_ino
    assert destination.read_bytes() == packed and gzip.decompress(destination.read_bytes()) == raw
    external.append({'originalPath': str(path.relative_to(root)),
                     'path': str(destination.relative_to(root)), 'bytes': len(packed),
                     'sha256': digest(packed), 'decodedBytes': len(raw),
                     'decodedSha256': digest(raw), 'sameInode': True})

packet = {'schema': 'complete-original-decoder-evidence-v1', 'sourceBase': commit,
          'checks': checks, 'members': members, 'external': external,
          'censusBeforeBytes': before, 'controlledComparativeBenchmark': False,
          'performanceQualified': False, 'fullGateQualified': False, 'runtimeParity': False,
          'rustExecuted': False, 'interruptedReportsRemainUnqualified': True}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
assert before + len(packed) < 500_000_000
with target.open('xb') as stream:
    stream.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
decoded = json.loads(gzip.decompress(target.read_bytes()))
for member in decoded['members']:
    data = base64.b64decode(member['base64'], validate=True)
    assert len(data) == member['bytes'] and digest(data) == member['sha256']
assert census() < 500_000_000
print(json.dumps({'path': str(target.relative_to(root)), 'bytes': len(packed),
                  'sha256': digest(packed), 'completeMembers': len(members),
                  'completeExternalContainers': len(external),
                  'censusAfterBytes': census(), 'fullGateQualified': False}))
