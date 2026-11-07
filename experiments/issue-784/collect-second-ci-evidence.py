"""Pin complete second-restart originals after all selected checks close."""
import hashlib
import gzip
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
paths = set()
for candidate in (root / 'experiments/issue-784').glob('restart2-*'):
    if candidate.is_file():
        paths.add(candidate)
paths.update(path for path in (root / 'ci-logs/issue-784-restart-2').rglob('*')
             if path.is_file() and not path.name.startswith('evidence-'))
proposal = json.loads(gzip.decompress((root / 'ci-logs/issue-784-restart-2/whole-owner-proposal.json.gz').read_bytes()))
paths.update(root / row['path'] for row in proposal['inputs'] + proposal['prerequisiteInputs'])
fixture_receipts = []
for log in list(paths):
    if log.suffix != '.log':
        continue
    for value in re.findall(r'^Complete Node deadline evidence: (.+)$', log.read_text(), re.M):
        directory = Path(value).resolve()
        if directory.parent != root / 'js/node_modules/.node-case-deadlines':
            if not re.fullmatch(r'/tmp/router-gate-concurrency-[A-Za-z0-9]+/js/node_modules/\.node-case-deadlines/complete-[A-Za-z0-9]+', value):
                raise RuntimeError('Unexpected deadline receipt: ' + value)
            fixture_receipts.append({'log': log.relative_to(root).as_posix(),
                                     'path': value, 'present': directory.exists(),
                                     'scope': 'Nested temporary fixture, removed by the original test; its complete parent log is retained.'})
            continue
        if not (directory / 'terminal.json').is_file():
            raise RuntimeError('Unclosed deadline attempt: ' + value)
        paths.update(path for path in directory.rglob('*') if path.is_file())
changed = subprocess.check_output(['git', 'diff', '--name-only', '-z', '7dceb9b0a'], cwd=root).decode()
paths.update(root / name for name in changed.split('\0') if name)
paths.update(root / name for name in subprocess.check_output(
    ['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0') if name)
for name in ['scripts/run-node-tests.mjs', 'scripts/node-case-deadlines.mjs',
             'scripts/node-case-deadline-reporter.mjs', 'js/package-lock.json',
             'experiments/issue-784/with-child-reaper.py',
             'tools/evidence/capture-packet.py']:
    paths.add(root / name)
members = []
for path in sorted(paths):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(root):
        raise RuntimeError('Expected complete regular task original: ' + str(path))
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(65536), b''):
            digest.update(block)
    size = path.stat().st_size
    if size > 128 * 1024 * 1024:
        raise RuntimeError('Oversized original: ' + str(path))
    members.append({'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
                    'bytes': size, 'sha256': digest.hexdigest()})
total = sum(row['bytes'] for row in members)
if not members or len(members) > 8192 or total > 500_000_000:
    raise RuntimeError('Task evidence budget exceeded')
target = root / 'ci-logs/issue-784-restart-2/evidence-manifest.json'
target.write_text(json.dumps({'members': members}, indent=2) + '\n')
print(json.dumps({'members': len(members), 'completeBytes': total,
                  'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'nestedFixtureReceiptReferences': fixture_receipts,
                  'manifest': str(target)}))
