"""Plan complete restart evidence after local and remote commands have closed."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTED_HEAD = '08e09f884546ecf373dfa2997f7d0dd906a0cb1c'
paths = set()
for directory, pattern in [
    ('ci-logs', 'restart-*'),
    ('experiments/issue-784', 'restart-*.log'),
    ('experiments/issue-784', '*.py'),
]:
    for candidate in (ROOT / directory).glob(pattern):
        if candidate.name == 'restart-evidence-manifest.json':
            continue
        if candidate.is_file():
            paths.add(candidate)
        elif candidate.is_dir():
            paths.update(path for path in candidate.rglob('*') if path.is_file())

log = ROOT / 'experiments/issue-784/restart-full-gate.log'
if 'JavaScript preflight failed (no green stamp written):' not in log.read_text():
    raise RuntimeError('The failed complete local attempt has not closed')
deadline_root = ROOT / 'js/node_modules/.node-case-deadlines'
for value in re.findall(r'^Complete Node deadline evidence: (.+)$',
                        log.read_text(), re.M):
    directory = Path(value).resolve()
    if directory.parent != deadline_root or not directory.name.startswith('complete-'):
        raise RuntimeError('Unexpected deadline receipt path: ' + value)
    if not (directory / 'terminal.json').is_file():
        raise RuntimeError('Missing terminal receipt: ' + value)
    paths.update(path for path in directory.iterdir() if path.is_file())

changed = subprocess.check_output(
    ['git', 'diff', '--name-only', '-z', '1e6e0b36a', TESTED_HEAD], cwd=ROOT
).decode().split('\0')
paths.update(ROOT / name for name in changed if name)
for name in [
    'scripts/check-js-first-local.mjs', 'scripts/check-js-first-workflows.mjs',
    'scripts/run-node-tests.mjs', 'scripts/node-case-deadlines.mjs',
    'scripts/node-case-deadline-reporter.mjs',
    '.github/workflows/javascript-first.yml', 'js/package-lock.json',
    'tools/evidence/capture-packet.py',
]:
    path = ROOT / name
    if not path.is_file():
        raise RuntimeError('Missing selected harness input: ' + name)
    paths.add(path)

members = []
for path in sorted(paths):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(ROOT):
        raise RuntimeError('Only complete ordinary task originals: ' + str(path))
    size = path.stat().st_size
    if size > 128 * 1024 * 1024:
        raise RuntimeError('Oversized original: ' + str(path))
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(65536), b''):
            digest.update(block)
    members.append({'path': path.relative_to(ROOT).as_posix(),
                    'originalPath': str(path), 'bytes': size,
                    'sha256': digest.hexdigest()})
total = sum(member['bytes'] for member in members)
if not members or len(members) > 8192 or total > 500_000_000:
    raise RuntimeError('Task evidence budget exceeded')
target = ROOT / 'ci-logs/restart-evidence-manifest.json'
target.write_text(json.dumps({'members': members}, indent=2) + '\n')
print(json.dumps({'members': len(members), 'completeBytes': total,
                  'testedHead': TESTED_HEAD, 'manifest': str(target)}))
