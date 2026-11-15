"""Plan a complete post-repair packet; run only after the checks have closed."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
paths = set()
patterns = [
    'experiments/issue-784/*-repaired.log',
    'experiments/issue-784/historical-bun-*.log',
    'experiments/issue-784/historical-checks.*',
    'experiments/issue-784/historical-checks-summary.log',
    'experiments/issue-784/final-*.log',
    'experiments/issue-784/final-checks.json',
    'experiments/issue-784/network-*.log',
    'experiments/issue-784/final-generation.log',
    'experiments/issue-784/*.py',
    'ci-logs/historical*', 'ci-logs/final-*.json',
    'ci-logs/latest-runs.json', 'ci-logs/gate-evidence-index.txt',
    'ci-logs/*review*.diff', 'ci-logs/full-review-stat.txt',
    'js/node_modules/.node-case-deadlines/complete-r8QRiB/*',
]
for pattern in patterns:
    paths.update(path for path in root.glob(pattern) if path.is_file())
for log in sorted((root / 'experiments/issue-784').glob('final-*.log')):
    for directory in re.findall(r'^Complete Node deadline evidence: (.+)$',
                                log.read_text(), re.M):
        receipt = Path(directory).resolve()
        expected = root / 'js/node_modules/.node-case-deadlines'
        if receipt.parent != expected or not receipt.name.startswith('complete-'):
            raise ValueError('Unexpected deadline evidence path: ' + directory)
        paths.update(path for path in receipt.iterdir() if path.is_file())
changed = subprocess.check_output(
    ['git', 'diff', '--name-only', '-z', '6f36a43f', 'HEAD'], cwd=root
).decode().split('\0')
paths.update(root / name for name in changed if name and (root / name).is_file())
for name in ['scripts/run-node-tests.mjs', 'scripts/node-case-deadlines.mjs',
             'scripts/node-case-deadline-reporter.mjs', 'js/package-lock.json']:
    paths.add(root / name)
members = []
for path in sorted(paths):
    if path.is_symlink() or not path.is_file():
        raise ValueError('Only complete ordinary originals: ' + str(path))
    size = path.stat().st_size
    if size > 128 * 1024 * 1024:
        raise ValueError('Oversized original: ' + str(path))
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(65536), b''):
            digest.update(block)
    members.append({'path': path.relative_to(root).as_posix(),
                    'originalPath': str(path), 'bytes': size,
                    'sha256': digest.hexdigest()})
total = sum(row['bytes'] for row in members)
if not members or total > 500 * 1024 * 1024:
    raise ValueError('Task evidence budget exceeded')
target = root / 'ci-logs/evidence-manifest-repairs.json'
target.write_text(json.dumps({'members': members}, indent=2) + '\n')
print(json.dumps({'members': len(members), 'completeBytes': total,
                  'manifest': str(target)}))
