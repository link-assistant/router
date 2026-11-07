#!/usr/bin/env python3
"""Freeze complete new originals after the 545f2909d cycle; no parity claim."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
cycle = root / 'ci-logs/issue-784-checkpoint-545f2909d'
target = directory / 'phased-clone-evidence-manifest.json'
head = '545f2909d14817f33ba18721a2d0c28690578544'
runs = json.loads((cycle / 'completed-head-runs.json').read_bytes())
if len(runs) != 7 or any(row['headSha'] != head or row['status'] != 'completed'
                        or any(job['status'] != 'completed' for job in row['jobs'])
                        for row in runs):
    raise RuntimeError('Every workflow of the published head must finish first')
if target.exists():
    raise RuntimeError('Refusing to overwrite a frozen complete selection')


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


prefixes = ('evidence-', 'storage-evidence-', 'token-evidence-',
            'history-evidence-', 'named-host-evidence-',
            'project-retention-evidence-', 'phased-clone-evidence-')
baseline = {}
for prefix in prefixes[:-1]:
    manifest = directory / (prefix + 'manifest.json')
    baseline.update({row['path']: row for row in
                     json.loads(manifest.read_bytes())['members']})
paths = {directory / 'project-retention-evidence-manifest.json'}
for parent in [directory, cycle]:
    for path in parent.rglob('*'):
        if not path.is_file() or path.name.startswith(prefixes):
            continue
        previous = baseline.get(path.relative_to(root).as_posix())
        if previous is None or path.stat().st_size != previous['bytes'] or digest(path) != previous['sha256']:
            paths.add(path)
changed = subprocess.check_output(
    ['git', 'diff', '--name-only', '-z', head], cwd=root).decode().split('\0')
untracked = subprocess.check_output(
    ['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
for name in changed + untracked:
    if name.startswith(('tools/translation/', 'experiments/issue-784/',
                        'docs/case-studies/issue-784/', 'changelog.d/')):
        path = root / name
        if path.is_file() and '/evidence/' not in name:
            paths.add(path)
for name in ['scripts/check-js-first-local.mjs', 'scripts/run-node-tests.mjs',
             'scripts/node-case-deadlines.mjs', 'scripts/node-case-deadline-reporter.mjs',
             'js/package-lock.json', 'tools/evidence/capture-packet.py',
             'tools/translation/prepare-invocation-local-freezer.mjs',
             'tools/translation/test/derive-output-effects.test.mjs',
             'tools/translation/source-profiles/current-receiving-source-history/complete-originals.json.gz',
             'tools/translation/source-profiles/facade-ast-receiving-history/complete-inputs.json.gz']:
    paths.add(root / name)
for log in list(paths):
    if log.suffix != '.log':
        continue
    for value in re.findall(r'^Complete Node deadline evidence: (.+)$', log.read_text(), re.M):
        attempt = Path(value)
        if attempt.parent != root / 'js/node_modules/.node-case-deadlines' or not (attempt / 'terminal.json').is_file():
            raise RuntimeError('Expected a complete closed local Node receipt: ' + value)
        paths.update(path for path in attempt.rglob('*') if path.is_file())
members = []
for path in sorted(paths):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(root) or path.stat().st_size > 128 * 1024 * 1024:
        raise RuntimeError('Expected bounded complete regular task original: ' + str(path))
    members.append({'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
                    'bytes': path.stat().st_size, 'sha256': digest(path)})
total = sum(row['bytes'] for row in members)
if not members or len(members) > 8192 or total > 500_000_000:
    raise RuntimeError('Complete selection exceeds the task evidence bound')
with target.open('x') as output:
    json.dump({'members': members}, output, indent=2)
    output.write('\n')
print(json.dumps({'members': len(members), 'completeBytes': total,
                  'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'manifest': str(target), 'scope': 'Complete new evidence only; no gate or compiler qualification.'}))
