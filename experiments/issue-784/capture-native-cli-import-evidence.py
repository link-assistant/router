"""Retain complete closed CLI checks and move the full source proposal intact."""
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
directory = root / 'docs/case-studies/issue-784/evidence/native-cli-imports'
target = directory.parent / 'current-native-cli-imports.json.gz'
assert not directory.exists() and not target.exists()
hash_bytes = lambda raw: hashlib.sha256(raw).hexdigest()


def census():
    size = 0
    for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                 'js/node_modules/.node-case-deadlines']:
        for parent, children, files in os.walk(name):
            if Path(parent) == Path('experiments/issue-784'):
                children[:] = [child for child in children if child != 'toolchain']
            size += sum((Path(parent) / name).stat().st_size for name in files
                        if not (Path(parent) / name).is_symlink())
    return size


paths, checks = set(), []
for label in ['current-native-cli-import-proposal', 'current-native-cli-import-install',
              'current-native-cli-import-node', 'current-native-cli-import-bun']:
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and receipt['interrupted'] is None and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    assert not receipt['stoppedOwnedProcessIds']
    paths.update(base / (label + suffix) for suffix in ['.log', '.memory.json', '.observer.log'])
    audits = []
    for name in re.findall(r'Complete Node deadline evidence: (\S+)',
                           (base / (label + '.log')).read_text()):
        path = Path(name)
        assert path.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((path / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == 0 and terminal['childClosed']
        assert terminal['groupCleanup']['complete'] and terminal['interrupted'] is None
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
        paths.update(item for item in path.iterdir() if item.is_file())
        audits.append({'directory': name, 'summary': terminal['auditSummary']})
    checks.append({'label': label, 'exitCode': 0, 'resourceStopped': False, 'audits': audits})
sources = [
    'tools/translation/prepare-native-output-text-retention.mjs',
    'tools/translation/prepare-current-native-output-text-retention.mjs',
    'tools/translation/test/native-output-text-retention.test.mjs',
    'tools/translation/test/current-native-output-text-retention.test.mjs',
    'scripts/translate-router-owned-field-meta.mjs',
    'scripts/translate-router-native-owned-field-meta.mjs',
    'experiments/issue-784/install-native-cli-import-proposal.mjs',
    'experiments/issue-784/retire-original-decoder-raw-duplicates.py',
    'experiments/issue-784/native-cli-import-plan.md',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/capture-native-cli-import-evidence.py',
]
paths.update(root / name for name in sources)
paths.update(base / name for name in ['current-native-cli-import-install.json.gz',
    'current-original-decoder-duplicate-retirement.json',
    'current-original-decoder-duplicate-retirement.log'])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root)), 'bytes': len(raw),
                    'sha256': hash_bytes(raw), 'base64': base64.b64encode(raw).decode()})
commit = subprocess.check_output(['git', 'rev-parse', 'b08f1b448'], text=True).strip()
for path in sources[:6]:
    raw = subprocess.check_output(['git', 'show', commit + ':' + path])
    members.append({'path': 'git:' + commit + ':' + path, 'bytes': len(raw),
                    'sha256': hash_bytes(raw), 'base64': base64.b64encode(raw).decode()})
proposal = base / 'current-native-cli-import-proposal.json.gz'
state = proposal.lstat()
assert state.st_nlink == 1 and not proposal.is_symlink()
packed = proposal.read_bytes()
assert hash_bytes(packed) == '6059596ab5960e283a35df37d3216c0941b776fb1be581ed99211839eb4e58c3'
raw = gzip.decompress(packed)
value = json.loads(raw)
assert value['schema'] == 'complete-current-native-output-retention-v1'
assert len(value['files']) == 7 and value['performanceQualified'] is False
for row in value['files']:
    assert (root / row['path']).read_text() == row['after']
    assert row['inverse'] == row['before']
    assert row['sourceHistory']['before'] == row['historical']['after']
    assert row['sourceHistory']['after'] == row['after']
    assert row['sourceHistory']['inverse'] == row['historical']['after']
directory.mkdir()
destination = directory / proposal.name
proposal.rename(destination)
assert destination.stat().st_ino == state.st_ino and destination.read_bytes() == packed
assert gzip.decompress(destination.read_bytes()) == raw
external = {'originalPath': str(proposal.relative_to(root)),
            'path': str(destination.relative_to(root)), 'bytes': len(packed),
            'sha256': hash_bytes(packed), 'decodedBytes': len(raw),
            'decodedSha256': hash_bytes(raw), 'sameInode': True}
before = census()
packet = {'schema': 'complete-native-cli-import-evidence-v1', 'sourceBase': commit,
          'checks': checks, 'members': members, 'external': [external],
          'censusBeforeBytes': before, 'allOriginalDeadlinesRetained': True,
          'controlledComparativeBenchmark': False, 'performanceQualified': False,
          'fullGateQualified': False, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
assert before + len(packed) < 500_000_000
with target.open('xb') as stream:
    stream.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    content = base64.b64decode(member['base64'], validate=True)
    assert len(content) == member['bytes'] and hash_bytes(content) == member['sha256']
assert census() < 500_000_000
print(json.dumps({'path': str(target.relative_to(root)), 'bytes': len(packed),
                  'sha256': hash_bytes(packed), 'completeMembers': len(members),
                  'completeExternalContainers': 1, 'censusAfterBytes': census(),
                  'fullGateQualified': False}))
