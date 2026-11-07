"""Freeze complete native-regeneration originals and terminal test attempts."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--head', required=True)
parser.add_argument('--manifest', required=True)
args = parser.parse_args()
if (not re.fullmatch('[a-f0-9]{40}', args.head)
        or Path(args.manifest).name != args.manifest
        or not args.manifest.endswith('.json')):
    raise RuntimeError('Complete source SHA and fresh manifest filename required')
target = base / args.manifest
if target.exists():
    raise RuntimeError('Existing complete selection must stay intact')


def current_head():
    return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip()


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


if current_head() != args.head:
    raise RuntimeError('Original source head changed')
baseline = set()
for path in (root / 'docs/case-studies/issue-784/evidence').glob('*.json.gz'):
    with gzip.open(path, 'rt') as stream:
        record = json.load(stream)
    if record.get('allDecodedOriginalsVerified'):
        baseline.update((row['originalPath'], row['bytes'], row['sha256'])
                        for row in record.get('members', []))
selected = {path for path in base.glob('native-*') if path.is_file()}
for label in ['baseline', 'batch-candidate', 'batch-candidate-qualified']:
    for suffix in ['-cpu.json.gz', '-outputs.json.gz', '-result.json', '.memory.json']:
        if base / ('native-typescript-' + label + suffix) not in selected:
            raise RuntimeError('Every complete original profile and output is required')
logs = ['native-regeneration-batch-node.log',
        'native-regeneration-batch-node-retry.log',
        'native-typescript-batch-whole-node.log',
        'native-regeneration-isolated-node.log',
        'native-regeneration-export-node.log',
        'native-regeneration-export-node-retry.log',
        'native-regeneration-full-gate.log']
for name in logs:
    path = base / name
    if not path.is_file():
        raise RuntimeError('Required complete attempt log missing: ' + name)
    attempts = re.findall(r'^Complete Node deadline evidence: (.+)$', path.read_text(), re.M)
    if ((not name.endswith('full-gate.log') and len(attempts) != 1)
            or len(attempts) > 16):
        raise RuntimeError('Full discovered Node attempt inventory differs: ' + name)
    for name in attempts:
        attempt = Path(name).resolve()
        if attempt.parent != root / 'js/node_modules/.node-case-deadlines':
            raise RuntimeError('Task-owned complete attempt required')
        terminal = json.loads((attempt / 'terminal.json').read_bytes())
        if not terminal['childClosed'] or not terminal['groupCleanup']['complete']:
            raise RuntimeError('All owned test processes must be reaped first')
        selected.update(path for path in attempt.iterdir() if path.is_file())
for pattern in ['experiments/issue-784/*native*',
                'tools/translation/source-profiles/native-regeneration-batch/*',
                'tools/translation/source-profiles/isolated-project-compiler/*',
                'tools/translation/test/fixtures/portable-git/*']:
    selected.update(path for path in root.glob(pattern) if path.is_file())
for name in ['tools/translation/js-to-rust/native-typescript.mjs',
             'tools/translation/js-to-rust/test/native-typescript.test.mjs',
             'tools/translation/js-to-rust/test/native-regeneration-batch.test.mjs',
             'tools/translation/prepare-native-regeneration-batch.mjs',
             'tools/translation/isolated-project-batch.mjs',
             'tools/translation/isolated-project-driver.mjs',
             'experiments/issue-784/probe-current-isolated-registry.mjs',
             'experiments/issue-784/refresh-current-isolated-registration.mjs',
             'experiments/issue-784/retire-archived-ci-duplicates.py',
             'docs/case-studies/issue-784/native-regeneration-batch.md']:
    selected.add(root / name)
members = []
for path in sorted(selected):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(root):
        raise RuntimeError('Whole ordinary original required: ' + str(path))
    row = {'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
           'bytes': path.stat().st_size, 'sha256': digest(path)}
    if row['bytes'] > 128 * 1024 * 1024:
        raise RuntimeError('Individual complete original exceeds finite bound')
    if (str(path), row['bytes'], row['sha256']) not in baseline:
        members.append(row)
total = sum(row['bytes'] for row in members)
if not members or len(members) > 8192 or total > 500_000_000 or current_head() != args.head:
    raise RuntimeError('Finite stable complete selection required')
with target.open('x') as stream:
    json.dump({'members': members}, stream, indent=2)
    stream.write('\n')
print(json.dumps({'manifest': str(target), 'members': len(members),
                  'completeBytes': total, 'sourceHead': args.head,
                  'allSelectedAttemptsTerminal': True, 'gateQualified': False}))
