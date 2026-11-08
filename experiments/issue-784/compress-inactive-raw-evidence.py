"""Losslessly compress explicit inactive task logs or one closed command record."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--closed-attempt')
parser.add_argument('--closed-investigations', action='store_true')
parser.add_argument('--closed-ci-investigations', action='store_true')
parser.add_argument('--closed-historical-observations', action='store_true')
parser.add_argument('--closed-current-diagnostics', action='store_true')
parser.add_argument('--receipt', default='reverse-shard-inactive-evidence-compression.json')
args = parser.parse_args()
assert sum(bool(value) for value in [args.closed_attempt, args.closed_investigations,
                                   args.closed_ci_investigations,
                                   args.closed_historical_observations,
                                   args.closed_current_diagnostics]) <= 1
assert Path(args.receipt).name == args.receipt and args.receipt.endswith('.json')
paths = [root / 'ci-logs' / name for name in [
    'restart-export-published-review.diff',
    'restart-published-review.diff',
    'restart-review-published.diff',
]] + [base / 'native-regeneration-before-csv-cache-advice.json']
if args.closed_attempt:
    assert Path(args.closed_attempt).name == args.closed_attempt and args.closed_attempt.startswith('complete-')
    attempt = root / 'js/node_modules/.node-case-deadlines' / args.closed_attempt
    terminal = json.loads((attempt / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths = [attempt / name for name in ['command.json', 'stdout.raw.tap', 'stderr.raw.log']
             if (attempt / name).exists() and (attempt / name).stat().st_size > 32768]
elif args.closed_investigations:
    # Complete historical task outputs only. Neither path is an input or cache.
    paths = [root / 'experiments/issue-784/local-gate-bounded.log',
             base / 'owned-allocation-analysis.json']
elif args.closed_ci_investigations:
    # Explicit historical task observations, never live producer inputs.
    paths = [root / 'ci-logs' / name for name in [
        'restart-export-complete-translation.log',
        'restart-export-complete-workflow.log',
        'restart-export-ci-watch.log',
        'restart-published-watch.log',
    ]] + [base / name for name in [
        'matrix-current-inputs.log',
        'current-node-profile-proposal.log',
        'ordinary-current-allocation.log',
    ]]
elif args.closed_current_diagnostics:
    # Exact completed diagnostic outputs only. The current whole-file run,
    # current CI snapshot and all source inputs remain outside this list.
    paths = [base / name for name in [
        'current-static-refusal-callback.cpuprofile',
        'module-token-layout-proposal.json', 'rust-token-layout-proposal.json',
        'static-source-budget-textual-diagnostic.json',
        'receiving-batch-completed-job-collection-11.json',
        'receiving-batch-completed-job-collection-6.json',
    ]] + [base / ('receiving-batch-live-main-' + str(index) + '.json')
          for index in range(1, 12)
          if (base / ('receiving-batch-live-main-' + str(index) + '.json')).exists()]
elif args.closed_historical_observations:
    # Frozen observations from completed attempts. No current producer input,
    # source, successfully archived packet, or live CI snapshot is selected.
    paths = [root / 'ci-logs' / name for name in [
        'evidence-manifest-6f36.json', 'restart-export-published-all-files.json',
        'restart-capture-receipt.json', 'restart-export-complete-native-node.log',
        'restart-evidence-manifest.json', 'restart-export-complete-forward-failures.json',
        'restart-published-workflows.json', 'restart-export-complete-head-workflows.json',
        'restart-export-complete-parity.log', 'restart-export-early-parity.log',
        'restart-published-parity.log', 'restart-export-complete-native-bun.log',
    ]] + [base / name for name in [
        'token-checkpoint-watch.log', 'archived-ci-duplicate-retirement.json',
        'ordinary-bang-progress-512.log', 'owned-stage-current-node-retirement.json',
        'ordinary-bang-progress-inspection.json', 'reverse-shard-full-gate.log',
        'archived-node-retirement.json', 'owned-stage-node-capture.json',
        'alias-existing-node.log', 'project-retention-evidence-capture-receipt.json',
        'owned-matrix-stage-full-gate.log', 'owned-allocation.log',
        'named-host-cache-aware-full-gate.log', 'current-isolated-full-gate.log',
        'project-retention-evidence-manifest.json', 'owned-stage-node-evidence-manifest.json',
        'storage-packet-capture.json', 'storage-evidence-manifest.json',
        'whole-file-shard-capture-retry.json', 'whole-file-shard-verified-node-retirement.json',
        'owned-matrix-stage-full-gate-inspection.json', 'whole-file-shard-full-gate.log',
        'runtime-import-integrated-full-gate.log', 'project-history-full-gate.log',
        'matrix-draft-full-gate.log', 'native-regeneration-full-gate.log',
        'clone-validation-corrected-full-gate.log', 'current-isolated-full-gate-inspection.json',
        'named-host-history-fixture-bun.log', 'whole-file-shard-retry-evidence-manifest.json',
        'whole-file-shard-evidence-manifest.json', 'resolver-evidence-retry-manifest.json',
        'phased-clone-evidence-capture.json', 'resolver-evidence-manifest.json',
        'phased-clone-evidence-manifest.json', 'storage-parity-completed-job.raw.log',
        'new-parity.log', 'identity-before.log', 'token-evidence-receipt.json',
        'named-host-evidence-packet.json', 'archived-allocation-retirement.json',
    ]] + [root / 'experiments/issue-784' / name
          for name in ['restart-full-gate.log', 'local-gate.log']]
receipt = base / args.receipt
assert not receipt.exists()


def digest(path, compressed=False):
    result, length = hashlib.sha256(), 0
    opener = gzip.open if compressed else open
    with opener(path, 'rb') as source:
        while block := source.read(1024 * 1024):
            result.update(block)
            length += len(block)
    return length, result.hexdigest()


active = set()
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for fd in (process / 'fd').iterdir():
            try:
                active.add(os.readlink(fd))
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
assert all(str(path) not in active for path in paths)
rows = []
for path in paths:
    state = path.lstat()
    assert path.is_file() and not path.is_symlink() and state.st_uid == os.getuid()
    assert state.st_nlink == 1 and state.st_size <= 32 * 1024 * 1024
    target = path.with_name(path.name + '.gz')
    original = digest(path)
    with target.open('xb') as output:
        with gzip.GzipFile(fileobj=output, mode='wb', compresslevel=6, mtime=0) as encoded:
            with path.open('rb') as source:
                while block := source.read(1024 * 1024):
                    encoded.write(block)
    assert digest(target, compressed=True) == original == digest(path)
    after = path.stat()
    assert (after.st_ino, after.st_size, after.st_mtime_ns) == (state.st_ino, state.st_size, state.st_mtime_ns)
    rows.append({'originalPath': str(path), 'compressedPath': str(target),
                 'originalBytes': original[0], 'originalSha256': original[1],
                 'compressedBytes': target.stat().st_size,
                 'completeReadbackVerified': True,
                 'allocatedBytesReclaimed': state.st_blocks * 512 - target.stat().st_blocks * 512})
    path.unlink()
with receipt.open('x') as output:
    json.dump({'rows': rows, 'completeOriginalsPreserved': True,
               'scope': 'Explicit inactive task logs or closed command record only. Complete gzip readback retains all original bytes; no source, active output, cache or foreign path.'}, output)
print(json.dumps({'completeFiles': len(rows), 'logicalBytesReclaimed': sum(row['originalBytes'] - row['compressedBytes'] for row in rows),
                  'allocatedBytesReclaimed': sum(row['allocatedBytesReclaimed'] for row in rows)}))
