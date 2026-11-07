"""Pin complete closed export checks and the preceding finished CI cycle."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
paths = set()
patterns = ['restart-published-complete-*', 'restart-published-native-*.log',
            'restart-published-final-*', 'restart-export-*',
            'restart-storage-transport-*', 'restart-metadata-compression*',
            'restart-column-compression*', 'restart-compression-*']
for pattern in patterns:
    for candidate in (root / 'ci-logs').glob(pattern):
        if candidate.name in ['restart-export-evidence-manifest.json',
                              'restart-export-evidence-plan.log',
                              'restart-export-capture-receipt.json',
                              'restart-export-capture.log']:
            continue
        if candidate.is_file():
            paths.add(candidate)
        elif candidate.is_dir():
            paths.update(path for path in candidate.rglob('*') if path.is_file())

log = root / 'ci-logs/restart-export-receiving.log'
if '# tests 34\n' not in log.read_text() or '# fail 1\n' not in log.read_text():
    raise RuntimeError('The complete Node receiving attempt has not closed')
bun = (root / 'ci-logs/restart-export-receiving-bun.log').read_text()
memory = json.loads((root / 'ci-logs/restart-export-memory.json').read_text())
if Path('/proc', str(memory['pid'])).exists():
    raise RuntimeError('The owned Bun attempt has not closed')
if not re.search(r'\n\s*\d+ pass\n', bun) and not any(
        row.get('signal') == 'SIGTERM' for row in memory['samples']):
    raise RuntimeError('Missing complete result or explicit owned resource stop')
deadline_root = root / 'js/node_modules/.node-case-deadlines'
for value in re.findall(r'^Complete Node deadline evidence: (.+)$', log.read_text(), re.M):
    directory = Path(value).resolve()
    if directory.parent != deadline_root or not directory.name.startswith('complete-'):
        raise RuntimeError('Unexpected deadline receipt path: ' + value)
    if not (directory / 'terminal.json').is_file():
        raise RuntimeError('Missing terminal receipt: ' + value)
    paths.update(path for path in directory.iterdir() if path.is_file())

changed = subprocess.check_output(
    ['git', 'diff', '--name-only', '-z', '7586d14b1', 'b913882ab'], cwd=root
).decode().split('\0')
paths.update(root / name for name in changed if name)
paths.update(path for path in (root / 'experiments/issue-784').iterdir()
             if path.is_file() and path.suffix in ['.py', '.mjs'])
for name in ['scripts/run-node-tests.mjs', 'scripts/node-case-deadlines.mjs',
             'scripts/node-case-deadline-reporter.mjs', 'js/package-lock.json',
             'tools/evidence/capture-packet.py',
             'tools/translation/export-bundle.mjs']:
    paths.add(root / name)

members = []
for path in sorted(paths):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(root):
        raise RuntimeError('Only complete ordinary task originals: ' + str(path))
    size = path.stat().st_size
    if size > 128 * 1024 * 1024:
        raise RuntimeError('Oversized original: ' + str(path))
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(65536), b''):
            digest.update(block)
    members.append({'path': path.relative_to(root).as_posix(),
                    'originalPath': str(path), 'bytes': size,
                    'sha256': digest.hexdigest()})
total = sum(member['bytes'] for member in members)
if not members or len(members) > 8192 or total > 500_000_000:
    raise RuntimeError('Task evidence budget exceeded')
target = root / 'ci-logs/restart-export-evidence-manifest.json'
target.write_text(json.dumps({'members': members}, indent=2) + '\n')
print(json.dumps({'members': len(members), 'completeBytes': total,
                  'sourceHead': subprocess.check_output(
                      ['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'manifest': str(target)}))
