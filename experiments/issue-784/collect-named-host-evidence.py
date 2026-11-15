#!/usr/bin/env python3
"""Pin complete new originals after the 943 CI cycle and named-host checks."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
cycle = root / 'ci-logs/issue-784-checkpoint-94367657f'
target = directory / 'named-host-evidence-manifest.json'
if target.exists():
    raise RuntimeError('Refusing to overwrite a frozen complete selection')
head = '94367657f8086dfb23d0d43f6584f15eb4a42346'
runs = json.loads((cycle / 'completed-head-runs.json').read_text())
if len(runs) != 7 or any(row['headSha'] != head or row['status'] != 'completed'
                        or any(job['status'] != 'completed' for job in row['jobs'])
                        for row in runs):
    raise RuntimeError('The entire immutable-head CI cycle must finish first')


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


baseline = {}
for name in ['evidence-manifest.json', 'storage-evidence-manifest.json',
             'token-evidence-manifest.json', 'history-evidence-manifest.json']:
    baseline.update({row['path']: row for row in
                     json.loads((directory / name).read_text())['members']})
paths = {directory / 'history-evidence-manifest.json'}
for parent in [directory, cycle]:
    for path in parent.rglob('*'):
        if not path.is_file() or path.name.startswith((
                'evidence-', 'storage-evidence-', 'token-evidence-',
                'history-evidence-', 'named-host-evidence-')):
            continue
        previous = baseline.get(path.relative_to(root).as_posix())
        if previous is None or path.stat().st_size != previous['bytes'] or digest(path) != previous['sha256']:
            paths.add(path)
for name in [
    'experiments/issue-784/plan.md',
    'experiments/issue-784/collect-named-host-evidence.py',
    'experiments/issue-784/capture-owned-reader-history.mjs',
    'experiments/issue-784/capture-host-asset-history.mjs',
    'experiments/issue-784/probe-original-csv-frontier.mjs',
    'experiments/issue-784/probe-original-csv-derive-owners.mjs',
    'experiments/issue-784/release-inactive-repository-pages.py',
    'experiments/issue-784/release-inactive-evidence-pages.py',
    'tools/translation/test/owned-reader-source-history.mjs',
    'tools/translation/test/owned-reader-source-history.test.mjs',
    'tools/translation/test/host-named-data-declarations.test.mjs',
    'tools/translation/test/fixtures/owned-reader-history/layers.json.gz',
    'tools/translation/test/fixtures/owned-reader-history/host.json.gz',
    'tools/translation/test/fixtures/owned-reader-history/NOTICE.md',
    'tools/translation/js-to-rust/owned-core-source.mjs',
    'tools/translation/extensions/host-contracts.mjs',
    'tools/translation/host-assets.mjs',
    'tools/translation/prepare-core-ascii-reverse-sources.mjs',
    'tools/translation/prepare-core-ascii-assets.mjs',
    'tools/translation/prepare-core-ascii-base-assets.mjs',
    'tools/translation/prepare-owned-runtime-import-edges.mjs',
    'tools/translation/prepare-core-ascii-sources.mjs',
    'docs/case-studies/issue-784/named-host-history-investigation.md',
    'experiments/issue-784/collect-completed-ci.py',
    'experiments/issue-784/inspect-completed-forward.py',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
    'experiments/issue-784/prepare-node20.py',
    'experiments/issue-784/cleanup-storage-toolchain.py',
    'experiments/issue-784/inspect-stock-intrinsics.mjs',
    'experiments/issue-784/prepare-rust-token-layout.mjs',
    'experiments/issue-784/probe-rust-token-layout.mjs',
    'experiments/issue-784/rust-token-layout.test.mjs',
    'experiments/issue-784/rust-token-original-source.mjs.txt',
    'docs/case-studies/issue-784/token-layout-investigation.md',
    'docs/case-studies/issue-784/verification.md',
    'tools/translation/prepare-default-proof-byte-adoption.mjs',
    'tools/translation/prepare-guarded-proof-lexing.mjs',
    'tools/translation/prepare-module-token-layout.mjs',
    'tools/translation/source-module-views.mjs',
    'tools/translation/test/default-proof-byte-prerequisites.test.mjs',
    'tools/translation/test/default-proof-byte-adoption.test.mjs',
    'tools/translation/test/derive-output-effects.test.mjs',
    'tools/translation/test/fixtures/derive-payload-before-196.json',
    'tools/translation/source-profiles/default-proof-byte-adoption/complete-original-inputs.json.gz',
    'scripts/check-js-first-local.mjs',
    'scripts/run-node-tests.mjs',
    'scripts/node-case-deadlines.mjs',
    'scripts/node-case-deadline-reporter.mjs',
    'js/package-lock.json', 'tools/evidence/capture-packet.py',
]:
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
                  'manifest': str(target), 'scope': 'Complete new evidence only; no full-gate or compiler-closure qualification.'}))
