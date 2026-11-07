"""Select complete new resolver evidence after every published-head job ends."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--head', required=True)
parser.add_argument('--cycle', required=True, type=Path)
parser.add_argument('--manifest', required=True)
args = parser.parse_args()
directory = root / 'ci-logs/issue-784-restart-2'
cycle = args.cycle.resolve()
if not re.fullmatch('[a-f0-9]{40}', args.head) or cycle.parent != root / 'ci-logs':
    raise RuntimeError('Complete source SHA and task CI directory required')
if Path(args.manifest).name != args.manifest or not args.manifest.endswith('.json'):
    raise RuntimeError('A fresh task manifest filename is required')
target = directory / args.manifest
if target.exists():
    raise RuntimeError('Refusing to replace an earlier complete selection')
runs = json.loads((cycle / 'completed-head-runs.json').read_bytes())
if len(runs) != 7 or any(row['headSha'] != args.head or row['status'] != 'completed'
                        or any(job['status'] != 'completed' for job in row['jobs'])
                        for row in runs):
    raise RuntimeError('Every published workflow and job must finish first')


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


# Previously public complete originals need no additional duplicate packet.
baseline = set()
for path in (root / 'docs/case-studies/issue-784/evidence').glob('*.json.gz'):
    with gzip.open(path, 'rt') as stream:
        record = json.load(stream)
    if not record.get('allDecodedOriginalsVerified'):
        continue
    for row in record.get('members', []):
        baseline.add((row['originalPath'], row['bytes'], row['sha256']))
selected = set()
for parent in [directory, cycle]:
    for path in parent.rglob('*'):
        if not path.is_file() or path == target:
            continue
        if (str(path), path.stat().st_size, digest(path)) not in baseline:
            selected.add(path)
# Include complete receiving and full-gate attempts, including the failed
# deadline audit and interrupted forward cohort. Terminal does not mean pass.
for name in ['current-isolated-node.log', 'current-export-node.log',
             'current-isolated-full-gate.log']:
    log = directory / name
    if not log.exists():
        continue
    matches = re.findall(r'^Complete Node deadline evidence: (.+)$', log.read_text(), re.M)
    expected = 3 if name == 'current-isolated-full-gate.log' else 1
    if len(matches) != expected:
        raise RuntimeError('Every original complete Node attempt is required')
    for value in matches:
        attempt = Path(value).resolve()
        if (attempt.parent != root / 'js/node_modules/.node-case-deadlines'
                or not (attempt / 'terminal.json').is_file()):
            raise RuntimeError('Original terminal receipt required')
        terminal = json.loads((attempt / 'terminal.json').read_bytes())
        if not terminal['childClosed'] or not terminal['groupCleanup']['complete']:
            raise RuntimeError('All selected attempt processes must finish first')
        selected.update(path for path in attempt.iterdir() if path.is_file())
names = subprocess.check_output(['git', 'diff', '--name-only', '-z', args.head], cwd=root)
names += subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=root)
for name in names.decode().split('\0'):
    if name.startswith(('experiments/issue-784/', 'docs/case-studies/issue-784/')):
        path = root / name
        if path.is_file() and '/evidence/' not in name:
            selected.add(path)
members = []
for path in sorted(selected):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(root):
        raise RuntimeError('Complete ordinary task files required: ' + str(path))
    size = path.stat().st_size
    if size > 128 * 1024 * 1024:
        raise RuntimeError('Individual complete evidence file exceeds its bound')
    members.append({'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
                    'bytes': size, 'sha256': digest(path)})
total = sum(row['bytes'] for row in members)
if not members or len(members) > 8192 or total > 500_000_000:
    raise RuntimeError('Complete finite evidence selection required')
with target.open('x') as stream:
    json.dump({'members': members}, stream, indent=2)
    stream.write('\n')
print(json.dumps({'manifest': str(target), 'members': len(members), 'completeBytes': total,
                  'publishedHead': args.head, 'allPublishedJobsTerminal': True,
                  'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'gateQualified': False, 'runtimeParity': False}))
