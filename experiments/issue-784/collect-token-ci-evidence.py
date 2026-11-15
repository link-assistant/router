#!/usr/bin/env python3
"""Freeze complete new token/gate evidence after the entire CI cycle closes."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
cycle = root / 'ci-logs/issue-784-checkpoint-007dc7f3a'
target = directory / 'token-evidence-manifest.json'
if target.exists():
    raise RuntimeError('Refusing to overwrite a frozen complete evidence selection')
runs = json.loads((cycle / 'completed-head-runs.json').read_text())
head = '007dc7f3a3a882d17ab87d2a53067ebb236f948f'
if len(runs) != 7 or any(row['headSha'] != head or row['status'] != 'completed'
                         or any(job['status'] != 'completed' for job in row['jobs'])
                         for row in runs):
    raise RuntimeError('The complete published-head CI cycle must finish first')
baseline_path = directory / 'storage-evidence-manifest.json'
baseline = {row['path']: row for row in json.loads(baseline_path.read_text())['members']}


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


paths = {baseline_path}
for parent in [directory, cycle]:
    for path in parent.rglob('*'):
        if not path.is_file() or path.name.startswith(('evidence-', 'storage-evidence-', 'token-evidence-')):
            continue
        relative = path.relative_to(root).as_posix()
        old = baseline.get(relative)
        if old is None or path.stat().st_size != old['bytes'] or digest(path) != old['sha256']:
            paths.add(path)
for name in [
    'experiments/issue-784/plan.md',
    'experiments/issue-784/collect-token-ci-evidence.py',
    'experiments/issue-784/collect-completed-ci.py',
    'experiments/issue-784/inspect-completed-forward.py',
    'experiments/issue-784/check-gate-fingerprint.py',
    'experiments/issue-784/probe-view-token-layout.mjs',
    'experiments/issue-784/run-view-token-layout.py',
    'experiments/issue-784/prepare-node20.py',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
    'experiments/issue-784/release-inactive-evidence-pages.py',
    'experiments/issue-784/release-inactive-repository-pages.py',
    'experiments/issue-784/cleanup-storage-toolchain.py',
    'docs/case-studies/issue-784/token-layout-investigation.md',
    'docs/development/module-token-layout.md',
    'tools/translation/source-module-views.mjs',
    'tools/translation/prepare-module-token-layout.mjs',
    'tools/translation/source-profiles/module-token-layout/original-source.mjs.txt',
    'tools/translation/test/module-token-layout.test.mjs',
    'tools/translation/test/source-module-views.test.mjs',
    'scripts/check-js-first-local.mjs',
    'scripts/test/check-js-first-local.test.mjs',
    'scripts/run-node-tests.mjs',
    'scripts/node-case-deadlines.mjs',
    'scripts/node-case-deadline-reporter.mjs',
    'js/package-lock.json',
    'tools/evidence/capture-packet.py',
]:
    paths.add(root / name)
attempt = root / 'js/node_modules/.node-case-deadlines/complete-op9K4R'
if not (attempt / 'terminal.json').is_file():
    raise RuntimeError('Complete token receiving evidence has no terminal receipt')
paths.update(path for path in attempt.rglob('*') if path.is_file())
members = []
for path in sorted(paths):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(root):
        raise RuntimeError('Expected a complete regular task original: ' + str(path))
    if path.stat().st_size > 128 * 1024 * 1024:
        raise RuntimeError('A complete original exceeds the existing member bound')
    members.append({'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
                    'bytes': path.stat().st_size, 'sha256': digest(path)})
total = sum(row['bytes'] for row in members)
if not members or len(members) > 8192 or total > 500_000_000:
    raise RuntimeError('Complete selected evidence exceeds the task allocation')
with target.open('x') as output:
    json.dump({'members': members}, output, indent=2)
    output.write('\n')
print(json.dumps({'members': len(members), 'completeBytes': total,
                  'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'earlierSelectionSha256': digest(baseline_path), 'manifest': str(target),
                  'scope': 'Complete new retained CI/local evidence and explicit source snapshots; no complete compiler-closure or full-gate claim.'}))
