"""Retain whole closed receiving checks, source vectors and failed attempts."""
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
destination = root / 'docs/case-studies/issue-784/evidence/receiving-performance-vectors'
target = destination.parent / 'current-receiving-performance.json.gz'
assert not destination.exists() and not target.exists()


def census():
    total = 0
    for directory in map(Path, ['ci-logs', 'docs/case-studies/issue-784',
                               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']):
        for parent, children, files in os.walk(directory):
            if directory == Path('experiments/issue-784') and Path(parent) == directory:
                children[:] = [name for name in children if name != 'toolchain']
            total += sum((Path(parent) / name).stat().st_size for name in files
                         if not (Path(parent) / name).is_symlink())
    return total


before_bytes = census()
assert before_bytes < 499_000_000
paths, checks = set(), []
failures = {
    'current-receiving-named-phases-node', 'current-receiving-named-batch-node',
    'current-receiving-complete-batch-node', 'current-receiving-sequential-node',
    'current-receiving-module-batch-node', 'current-sequential-phase-controls-node',
    'current-sequential-phase-opaque-controls-node',
}
labels = sorted(failures | {
    'current-receiving-prerequisite-batch-node', 'current-receiving-producer-trace',
    'current-receiving-and-module-controls-bun', 'current-module-and-phase-controls-node',
    'current-sequential-phase-contract-controls-node', 'current-sequential-phase-contract-controls-bun',
    'current-sequential-phase-producer', 'current-native-module-bindings-node',
    'current-native-module-scope-controls-node', 'current-default-caller-suite-node',
    'current-default-caller-suite-bun',
    'current-receiving-strict-typescript',
})
for label in labels:
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    expected = 1 if label in failures else 0
    assert receipt['exitCode'] == expected and not receipt['stopped']
    assert receipt['interrupted'] is None
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.update(base / (label + suffix) for suffix in ['.log', '.memory.json', '.observer.log'])
    log = (base / (label + '.log')).read_text()
    audits = re.findall(r'Complete Node deadline evidence: (\S+)', log)
    for name in audits:
        directory = Path(name)
        assert directory.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((directory / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == expected and terminal['childClosed']
        assert terminal['groupCleanup']['complete'] and terminal['interrupted'] is None
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        if label not in failures:
            assert terminal['auditSummary']['passed']
            assert terminal['auditSummary']['durationBreaches'] == 0
        paths.update(path for path in directory.iterdir() if path.is_file())
    checks.append({'label': label, 'exitCode': expected, 'completeAudits': audits})

# Move the complete original gzip containers without allocating duplicate copies.
# Every decoded source vector is read in full, and each renamed inode is checked.
vectors = []
for engine in ['node', 'bun']:
    directory = base / ('current-default-module-batch-vectors-' + engine)
    files = sorted(directory.glob('*.json.gz'))
    assert len(files) == 7
    for path in files:
        assert path.is_file() and not path.is_symlink()
        state = path.stat()
        packed = path.read_bytes()
        raw = gzip.decompress(packed)
        value = json.loads(raw)
        assert path.name == hashlib.sha256(value['name'].encode()).hexdigest() + '.json.gz'
        assert isinstance(value['vectors'], list)
        vectors.append({'originalPath': str(path.relative_to(root)),
                        'path': str((destination / engine / path.name).relative_to(root)),
                        'bytes': len(packed), 'sha256': hashlib.sha256(packed).hexdigest(),
                        'decodedBytes': len(raw), 'decodedSha256': hashlib.sha256(raw).hexdigest(),
                        'name': value['name'], 'completeVectorCount': len(value['vectors']),
                        'device': state.st_dev, 'inode': state.st_ino})
selected = {str(root / row['originalPath']) for row in vectors}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for descriptor in (process / 'fd').iterdir():
            try:
                assert os.readlink(descriptor) not in selected, 'active vector descriptor'
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
for row in vectors:
    source, retained = root / row['originalPath'], root / row['path']
    assert source.stat().st_ino == row['inode']
    retained.parent.mkdir(parents=True, exist_ok=True)
    assert not retained.exists()
    source.rename(retained)
    assert retained.stat().st_ino == row['inode']
    assert hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']

sources = [
    'tools/translation/prepare-current-receiving-source-history.mjs',
    'tools/translation/prepare-default-proof-byte-adoption.mjs',
    'tools/translation/prepare-schemars-enclosing-adoption.mjs',
    'tools/translation/source-copy-native-bindings.mjs',
    'tools/translation/prepare-sequential-concrete-phases.mjs',
    'tools/translation/private-parser-sequential-phases.mjs',
    'tools/translation/concrete-sequential-phases.mjs',
    'tools/translation/private-parser-named-phases.mjs',
    'tools/translation/concrete-named-phases.mjs',
    'tools/translation/test/concrete-sequential-phases.test.mjs',
    'tools/translation/test/source-copy-module-bindings.test.mjs',
    'tools/translation/test/current-negative-budget-history.test.mjs',
    'tools/translation/test/current-receiving-source-history.test.mjs',
    'tools/translation/test/default-proof-byte-adoption.test.mjs',
    'tools/translation/test/default-proof-byte-prerequisites.test.mjs',
    'tools/translation/test/schemars-enclosing-adoption.test.mjs',
    'experiments/issue-784/capture-receiving-performance-evidence.py',
]
paths.update(root / name for name in sources)
members = []


def retain(path, raw):
    members.append({'path': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                    'encoding': 'base64', 'content': base64.b64encode(raw).decode()})


for path in sorted(paths):
    assert path.is_file() and not path.is_symlink(), str(path)
    retain(str(path.relative_to(root)), path.read_bytes())
for name in sources[:4]:
    retain('git:0815e4ee1:' + name, subprocess.check_output(['git', 'show', '0815e4ee1:' + name]))
packet = {'schema': 'complete-receiving-performance-evidence-v1',
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
          'uncommittedSourceDraft': True, 'members': members, 'checks': checks,
          'externalCompleteMembers': vectors, 'externalMembersMovedWithoutCopy': True,
          'allDecodedOriginalsVerified': True,
          'intermediateCompleteProducerVectorsCaptured': False,
          'controlledComparativeBenchmark': False, 'fullGateQualified': False,
          'runtimeParity': False, 'rustExecuted': False}
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(packet, separators=(',', ':')).encode(), mtime=0))
decoded = json.loads(gzip.decompress(target.read_bytes()))
for row in decoded['members']:
    data = base64.b64decode(row['content'], validate=True)
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
for row in decoded['externalCompleteMembers']:
    data = (root / row['path']).read_bytes()
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
    raw = gzip.decompress(data)
    assert len(raw) == row['decodedBytes'] and hashlib.sha256(raw).hexdigest() == row['decodedSha256']
after_bytes = census()
assert after_bytes < 500_000_000
print(json.dumps({'packet': str(target.relative_to(root)), 'bytes': target.stat().st_size,
                  'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                  'completeMembers': len(members), 'externalCompleteMembers': len(vectors),
                  'completeRawBytes': sum(row['bytes'] for row in members),
                  'censusBefore': before_bytes, 'censusAfter': after_bytes}))
