"""Pin complete new originals after the published CI cycle and checks close."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
target = directory / 'storage-evidence-manifest.json'
if target.exists():
    raise RuntimeError('Refusing to overwrite a frozen evidence selection')
head = '84779613d2a334d131083c4bb4eff7f1680e8add'
runs = json.loads((directory / 'completed-head-runs.json').read_text())
if len(runs) != 7 or any(row['headSha'] != head or row['status'] != 'completed' for row in runs):
    raise RuntimeError('The entire published-head CI cycle must complete first')
status = json.loads((directory / 'current-run-status.json').read_text())
if status['headSha'] != head or status['status'] != 'completed' or any(
        row['status'] != 'completed' for row in status['jobs']):
    raise RuntimeError('The complete main CI job set must be terminal')
baseline_path = directory / 'evidence-manifest.json'
baseline = {row['path']: row for row in json.loads(baseline_path.read_text())['members']}

def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

paths = {baseline_path}
for path in directory.rglob('*'):
    if not path.is_file() or path.name.startswith(('evidence-', 'storage-evidence-')):
        continue
    relative = path.relative_to(root).as_posix()
    old = baseline.get(relative)
    if old is None or path.stat().st_size != old['bytes'] or digest(path) != old['sha256']:
        paths.add(path)
for name in [
    'experiments/issue-784/plan.md',
    'experiments/issue-784/prepare-node20.py',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
    'experiments/issue-784/cleanup-storage-toolchain.py',
    'experiments/issue-784/collect-storage-ci-evidence.py',
    'experiments/issue-784/collect-completed-ci.py',
    'experiments/issue-784/inspect-completed-forward.py',
    'experiments/issue-784/materialize-alias-history.mjs',
    'experiments/issue-784/run-alias-receiving-bun.py',
    'experiments/issue-784/inspect-source-producer-mismatches.mjs',
    'experiments/issue-784/materialize-class-entry-pin.mjs',
    'experiments/issue-784/profile-owned-generation.mjs',
    'experiments/issue-784/profile-owned-generation-child.mjs',
    'experiments/issue-784/analyze-owned-allocation.py',
    'docs/case-studies/issue-784/storage-investigation.md',
    'docs/development/owned-field-bulk-storage.md',
    'scripts/run-node-tests.mjs', 'scripts/node-case-deadlines.mjs',
    'scripts/node-case-deadline-reporter.mjs', 'js/package-lock.json',
    'tools/evidence/capture-packet.py',
    'tools/translation/proof-byte-identity-overlay-source.mjs',
    'tools/translation/prepare-batched-proof-byte-source-candidate.mjs',
    'tools/translation/prepare-whole-owner-proof-byte-original-trial.mjs',
    'tools/translation/whole-owner-proof-byte-trial-support.mjs',
    'tools/translation/whole-owner-proof-byte-original-derive-trial.mjs',
    'tools/translation/compiler-alias-source-evolution.mjs',
    'tools/translation/prepare-compiler-alias-history.mjs',
    'tools/translation/test/fixtures/compiler-data-alias-history.mjs',
    'tools/translation/prepare-builtin-source-meta-string-keys.mjs',
    'tools/translation/proof-scanner-source-evolution.mjs',
    'tools/translation/prepare-invocation-local-freezer.mjs',
    'tools/translation/prepare-static-source-release.mjs',
    'tools/translation/prepare-real-source-fixtures.mjs',
    'tools/translation/prepare-original-class-birth.mjs',
    'tools/translation/extensions/original-class-definition-birth.mjs',
    'tools/translation/extensions/host-contracts.mjs',
    'tools/translation/class-program-storage.mjs',
]:
    paths.add(root / name)
for name in [
    'owned-field-bulk', 'owned-field-isolated-matrix-cli',
    'compressed-project-meta-storage', 'project-meta-utf8-storage',
    'private-output-text', 'isolated-matrix', 'matrix-bulk',
    'proof-byte-identity-overlays', 'whole-owner-proof-byte-candidate',
    'batched-proof-byte-source-candidate', 'compiler-alias-source-evolution',
    'builtin-source-meta-string-keys', 'builtin-json-equality-hint',
    'builtin-plan-json-composition', 'builtin-proof-json-composition',
    'completed-json-eligibility', 'source-producer-freshness',
    'source-producer-evolution', 'invocation-local-freezer', 'static-source-release',
]:
    paths.add(root / 'tools/translation/test' / (name + '.test.mjs'))
for log in list(paths):
    if log.suffix != '.log':
        continue
    for value in re.findall(r'^Complete Node deadline evidence: (.+)$', log.read_text(), re.M):
        attempt = Path(value)
        if attempt.parent != root / 'js/node_modules/.node-case-deadlines':
            raise RuntimeError('Unexpected complete Node receipt path: ' + value)
        if not (attempt / 'terminal.json').is_file():
            raise RuntimeError('Unclosed local Node attempt: ' + value)
        paths.update(path for path in attempt.rglob('*') if path.is_file())
members = []
for path in sorted(paths):
    if path.is_symlink() or not path.is_file() or not path.is_relative_to(root):
        raise RuntimeError('Expected complete regular task original: ' + str(path))
    if path.stat().st_size > 128 * 1024 * 1024:
        raise RuntimeError('Oversized complete original: ' + str(path))
    members.append({'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
                    'bytes': path.stat().st_size, 'sha256': digest(path)})
total = sum(row['bytes'] for row in members)
if not members or len(members) > 8192 or total > 500_000_000:
    raise RuntimeError('Complete selection exceeds the task evidence budget')
with target.open('x') as output:
    output.write(json.dumps({'members': members}, indent=2) + '\n')
print(json.dumps({'members': len(members), 'completeBytes': total,
                  'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'earlierSelectionSha256': digest(baseline_path), 'manifest': str(target)}))
