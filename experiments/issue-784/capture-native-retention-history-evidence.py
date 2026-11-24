"""Keep complete closed checks and move whole native proposals without copies."""
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
parser.add_argument('--check', action='append', required=True,
                    help='Closed observer label and exact exit code, LABEL:CODE')
args = parser.parse_args()
root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
destination = root / 'docs/case-studies/issue-784/evidence/native-retention-history'
target = destination.parent / 'current-native-retention-history.json.gz'
assert not destination.exists() and not target.exists()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


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
for value in args.check:
    label, expected = value.rsplit(':', 1)
    assert re.fullmatch(r'current-[a-z0-9-]+', label)
    expected = int(expected)
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == expected
    assert receipt['stopped'] == (expected == 143)
    assert receipt['interrupted'] is None
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    paths.update(base / (label + suffix) for suffix in ['.log', '.memory.json', '.observer.log'])
    audits = []
    for name in re.findall(r'Complete Node deadline evidence: (\S+)',
                           (base / (label + '.log')).read_text()):
        directory = Path(name)
        assert directory.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((directory / 'terminal.json').read_bytes())
        assert terminal['exitCode'] == expected and terminal['childClosed']
        assert terminal['groupCleanup']['complete'] and terminal['interrupted'] is None
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        paths.update(path for path in directory.iterdir() if path.is_file())
        audits.append({'directory': name, 'auditSummary': terminal['auditSummary']})
    checks.append({'label': label, 'exitCode': expected, 'resourceStopped': receipt['stopped'],
                   'completeAudits': audits})

paths.update(base / name for name in [
    'current-owned-field-prerequisite-install.json.gz',
    'current-native-retention-history-install.json.gz',
    'current-native-retention-predecessors-capture.log',
    'current-native-retention-recent-runs.json',
    'current-native-retention-worker-profile-summary.json',
])
sources = [
    'tools/translation/isolated-owned-field-matrix-bulk.mjs',
    'tools/translation/isolated-retained-owned-field-matrix-bulk.mjs',
    'tools/translation/owned-field-isolated-matrix-session.mjs',
    'tools/translation/isolated-native-retained-owned-field-matrix-bulk.mjs',
    'tools/translation/native-owned-field-isolated-matrix-session.mjs',
    'tools/translation/prepare-native-output-text-retention.mjs',
    'tools/translation/prepare-current-native-output-text-retention.mjs',
    'tools/translation/test/current-native-output-text-retention.test.mjs',
    'tools/translation/test/native-output-text-retention.test.mjs',
    'tools/translation/prepare-owned-field-bulk.mjs',
    'tools/translation/source-copy-native-bindings.mjs',
    'tools/translation/source-profiles/native-output-text-retention/complete-predecessors.json.gz',
    'experiments/issue-784/capture-native-retention-predecessors.py',
    'experiments/issue-784/install-owned-field-prerequisite.mjs',
    'experiments/issue-784/install-current-native-retention.mjs',
    'experiments/issue-784/capture-native-retention-history-evidence.py',
    'experiments/issue-784/trace-native-retention-cli.mjs',
    'experiments/issue-784/profile-isolated-retention-worker.mjs',
]
paths.update(root / name for name in sources)

# Whole proposals are already gzip containers. Renaming verified closed inodes
# preserves their actual bytes without allocating another evidence-sized copy.
external = []
for name, kind in [
    ('current-owned-field-prerequisite-proposal.json.gz', 'owned-source-proposal'),
    ('current-native-retention-history-proposal.json.gz', 'native-source-proposal'),
    ('current-native-retention-cli-matrix-trace.json.gz', 'complete-cli-progress-diagnostic'),
    ('current-native-retention-cli-refusal-trace.json.gz', 'complete-cli-refusal-diagnostic'),
    ('current-native-retention-worker-profile.json.gz', 'complete-worker-profile-diagnostic'),
]:
    path = base / name
    assert path.is_file() and not path.is_symlink()
    state = path.stat()
    packed = path.read_bytes()
    raw = gzip.decompress(packed)
    value = json.loads(raw)
    if kind.endswith('source-proposal'):
        count = 9 if kind == 'owned-source-proposal' else 7
        assert len(value['files']) == count
    elif 'cli' in kind:
        assert value['performanceQualified'] is False
        assert value['status'] == (1 if 'refusal' in kind else 0)
        assert value['error'] is None and value['signal'] is None
        assert isinstance(value['completeArtifacts'], list) and value['completeArtifacts']
        for row in value['completeArtifacts']:
            base64.b64decode(row['base64'], validate=True)
        count = None
    else:
        assert len(value['profiles']) == 1
        profile_value = json.loads(value['profiles'][0]['source'])
        assert profile_value['nodes'] and profile_value['samples']
        assert value['status'] == 0 and value['error'] is None and value['signal'] is None
        count = None
    external.append({'originalPath': str(path.relative_to(root)),
                     'path': str((destination / name).relative_to(root)),
                     'bytes': len(packed), 'sha256': digest(packed),
                     'decodedBytes': len(raw), 'decodedSha256': digest(raw),
                     'kind': kind, 'completeSourceEquations': count,
                     'device': state.st_dev, 'inode': state.st_ino})
selected = {str(root / row['originalPath']) for row in external}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for descriptor in (process / 'fd').iterdir():
            try:
                assert os.readlink(descriptor) not in selected, 'active proposal descriptor'
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
for row in external:
    source, retained = root / row['originalPath'], root / row['path']
    assert source.stat().st_ino == row['inode']
    retained.parent.mkdir(parents=True, exist_ok=True)
    assert not retained.exists()
    source.rename(retained)
    assert retained.stat().st_ino == row['inode']
    assert digest(retained.read_bytes()) == row['sha256']

members = []


def retain(name, raw):
    members.append({'path': name, 'bytes': len(raw), 'sha256': digest(raw),
                    'encoding': 'base64', 'content': base64.b64encode(raw).decode()})


for path in sorted(paths):
    assert path.is_file() and not path.is_symlink(), str(path)
    retain(str(path.relative_to(root)), path.read_bytes())
for name in sources[:6]:
    retain('git:a7bcf9526b0835f634b900e91fc30fc9c8301581:' + name,
           subprocess.check_output(['git', 'show', 'a7bcf9526:' + name]))
packet = {'schema': 'complete-native-retention-history-evidence-v1',
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
          'uncommittedSourceDraft': True, 'members': members, 'checks': checks,
          'externalCompleteMembers': external, 'externalMembersMovedWithoutCopy': True,
          'allDecodedOriginalsVerified': True, 'optionalOriginalCaseVectorsCaptured': False,
          'controlledComparativeBenchmark': False, 'fullGateQualified': False,
          'runtimeParity': False, 'rustExecuted': False}
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(packet, separators=(',', ':')).encode(), mtime=0))
decoded = json.loads(gzip.decompress(target.read_bytes()))
for row in decoded['members']:
    raw = base64.b64decode(row['content'], validate=True)
    assert len(raw) == row['bytes'] and digest(raw) == row['sha256']
for row in decoded['externalCompleteMembers']:
    packed = (root / row['path']).read_bytes()
    raw = gzip.decompress(packed)
    assert len(packed) == row['bytes'] and digest(packed) == row['sha256']
    assert len(raw) == row['decodedBytes'] and digest(raw) == row['decodedSha256']
after_bytes = census()
assert after_bytes < 500_000_000
print(json.dumps({'packet': str(target.relative_to(root)), 'bytes': target.stat().st_size,
                  'sha256': digest(target.read_bytes()), 'completeMembers': len(members),
                  'externalCompleteMembers': len(external),
                  'completeRawBytes': sum(row['bytes'] for row in members),
                  'censusBefore': before_bytes, 'censusAfter': after_bytes}))
