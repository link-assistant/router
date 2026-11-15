"""Retain complete source, failed/passed checks, samples and cleanup custody."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-module-item-freezing.json.gz')
assert not target.exists()
sha = lambda raw: hashlib.sha256(raw).hexdigest()
labels = {'before-node': 0, 'profile-before': 0, 'source-proposal': 0,
          'after-node': 0, 'late-observer-before-node': 1, 'source-proposal-v2': 0,
          'after-v2-node': 1, 'after-v2-rerun-node': 0, 'after-v2-bun': 0,
          'profile-after-v2': 0}
paths = []
for label, exit_code in labels.items():
    prefix = 'current-module-freeze-' + label
    paths += [base / (prefix + suffix) for suffix in ['.log', '.memory.json', '.observer.log']]
    memory = json.loads(paths[-2].read_bytes())
    assert memory['exitCode'] == exit_code and not memory['stopped']
    assert not Path('/proc/' + str(memory['pid'])).exists()
    if label.endswith('node'):
        log = paths[-3].read_text()
        match = re.search(r'Complete Node deadline evidence: (\S+)', log)
        assert match
        audit = Path(match[1])
        terminal = json.loads((audit / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        assert terminal['auditSummary']['passed'] and terminal['auditSummary']['durationBreaches'] == 0
        assert terminal['exitCode'] == exit_code
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        paths += sorted(path for path in audit.rglob('*') if path.is_file())
for stem in ['closed-observations', 'closed-translation-observations']:
    receipt = base / ('current-module-freeze-' + stem + '.json')
    paths += [receipt, receipt.with_suffix('.log')]
    for row in json.loads(receipt.read_bytes())['rows']:
        path = Path(row['compressedPath'])
        raw = gzip.decompress(path.read_bytes())
        assert len(raw) == row['originalBytes'] and sha(raw) == row['originalSha256']
        assert not Path(row['originalPath']).exists() and row['completeReadbackVerified']
        paths.append(path)
paths += [base / ('current-module-freeze-' + name) for name in [
    'install.log', 'restore-rejected.log', 'install-v2.log', 'profile-comparison.json',
    'profile-comparison.log', 'container-retention.json', 'container-retention.log']]
paths += [Path(name) for name in [
    'tools/translation/source-module-views.mjs',
    'tools/translation/prepare-module-token-layout.mjs',
    'tools/translation/module-item-native-freeze-source.mjs',
    'tools/translation/test/module-item-native-freeze.test.mjs',
    'experiments/issue-784/module-items-freeze-plan.md',
    'experiments/issue-784/prepare-module-item-freeze.mjs',
    'experiments/issue-784/profile-module-item-freeze.mjs',
    'experiments/issue-784/install-module-item-freeze.py',
    'experiments/issue-784/retain-module-item-freeze-containers.py',
    'experiments/issue-784/compare-module-item-freeze-profiles.py',
    'experiments/issue-784/compress-inactive-raw-evidence.py',
    'experiments/issue-784/capture-module-item-freeze-evidence.py',
    'docs/case-studies/issue-784/current-module-item-freezing.md',
]]
members = []
for path in dict.fromkeys(paths):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    members.append({'path': str(path.resolve().relative_to(root)), 'bytes': len(raw),
                    'sha256': sha(raw), 'base64': base64.b64encode(raw).decode()})
external = []
for path in sorted(Path('docs/case-studies/issue-784/evidence/module-item-freeze').glob('*.json.gz')):
    packed = path.read_bytes()
    raw = gzip.decompress(packed)
    json.loads(raw)
    external.append({'path': str(path), 'bytes': len(packed), 'sha256': sha(packed),
                     'decodedBytes': len(raw), 'decodedSha256': sha(raw)})
assert len(external) == 4
packet = {'schema': 'complete-private-module-item-freezing-evidence-v1', 'members': members,
          'external': external, 'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
          'newExecutableApplicationFunctions': 0, 'fullGenerationQualified': False,
          'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
size = 0
for directory in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784', 'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(directory):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        size += sum((Path(parent) / name).stat().st_size for name in files if not (Path(parent) / name).is_symlink())
assert size + len(packed) < 500000000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(member['base64'], validate=True)
    assert len(restored) == member['bytes'] and sha(restored) == member['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'sha256': sha(packed),
                  'completeMembers': len(members), 'externalContainers': len(external),
                  'censusAfterBytes': size + len(packed)}))
