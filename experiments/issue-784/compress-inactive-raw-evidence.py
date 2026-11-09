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
parser.add_argument('--closed-published-source-review', action='store_true')
parser.add_argument('--closed-alias-checkpoint', action='store_true')
parser.add_argument('--closed-generation-observations', action='store_true')
parser.add_argument('--closed-translation-observations', action='store_true')
parser.add_argument('--closed-10fd-early-observations', action='store_true')
parser.add_argument('--closed-prior-cycle-observations', action='store_true')
parser.add_argument('--closed-terminal-ci-observations', action='store_true')
parser.add_argument('--closed-10fd-final-observations', action='store_true')
parser.add_argument('--closed-matrix-custody-observations', action='store_true')
parser.add_argument('--closed-draft-observations', action='store_true')
parser.add_argument('--closed-raw-packet-preflight', action='store_true')
parser.add_argument('--retained-17c7-metadata', action='store_true')
parser.add_argument('--closed-4e709-snapshots', action='store_true')
parser.add_argument('--closed-4e709-terminal-snapshots', action='store_true')
parser.add_argument('--closed-standard-observations', action='store_true')
parser.add_argument('--receipt', default='reverse-shard-inactive-evidence-compression.json')
args = parser.parse_args()
assert sum(bool(value) for value in [args.closed_attempt, args.closed_investigations,
                                   args.closed_ci_investigations,
                                   args.closed_historical_observations,
                                   args.closed_current_diagnostics,
                                   args.closed_published_source_review,
                                   args.closed_alias_checkpoint,
                                   args.closed_generation_observations,
                                   args.closed_translation_observations,
                                   args.closed_10fd_early_observations,
                                   args.closed_prior_cycle_observations,
                                   args.closed_terminal_ci_observations,
                                   args.closed_10fd_final_observations,
                                   args.closed_matrix_custody_observations,
                                   args.closed_draft_observations, args.closed_raw_packet_preflight,
                                   args.retained_17c7_metadata, args.closed_4e709_snapshots,
                                   args.closed_4e709_terminal_snapshots,
                                   args.closed_standard_observations]) <= 1
assert Path(args.receipt).name == args.receipt and args.receipt.endswith('.json')
paths = [root / 'ci-logs' / name for name in [
    'restart-export-published-review.diff',
    'restart-published-review.diff',
    'restart-review-published.diff',
]] + [base / 'native-regeneration-before-csv-cache-advice.json']
if args.closed_standard_observations:
    # Closed profiles, probes and immutable earlier snapshots. The published
    # workflow can still be running; no live output, input or latest snapshot
    # is selected. Recover every original by appending .gz to its old path.
    paths = [base / name for name in [
        'current-unicode-facade.cpuprofile', 'current-unit-before.cpuprofile',
        'current-numeric-record-probe.json', 'current-record-field-emission.json',
        'current-published-764-directory-metadata.json',
        'current-published-17c7-directory-metadata.json',
        'current-published-567-directory-metadata.json',
        'current-published-4e9fad88-directory-metadata.json',
    ]]
    paths += [base / ('current-1c235-ci-run-' + str(index) + '.json')
              for index in range(1, 15)]
    paths += [base / ('current-1c235-completed-log-snapshot-' + str(index) + '.json')
              for index in range(1, 7)]
elif args.closed_attempt:
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
elif args.closed_published_source_review:
    # Closed review of the already published 17c7 checkpoint, never a producer input.
    paths = [base / 'current-publish-source-review.diff']
elif args.closed_alias_checkpoint:
    # Explicit closed original observations; full bytes remain in gzip form.
    paths = [base / name for name in [
        'current-translation-four-rerun-complete.log',
        'current-publish-readable-review.diff', 'current-alias-reader-numstat.txt',
    ]]
elif args.closed_generation_observations:
    # Exact closed observations from previous published heads, never inputs.
    paths = [base / name for name in [
        'current-d46-native-closed-deadline-retirement.json',
        'receiving-batch-completed-job-collection-13-validity-2.json',
        'receiving-batch-completed-job-collection-13.json',
        'receiving-batch-completed-job-collection-12.json',
        'receiving-batch-completed-job-collection-3.json',
        'current-unit-application-incomplete-data-capture.json',
        'current-d46b10bba-full-gate.log',
        'current-unit-application-incomplete-data-manifest.json',
        'current-d46-native-closed-deadline-evidence-capture.json',
        'current-node-profile-ci-failure-index.txt',
        'receiving-batch-early-reverse-failure-index.txt',
    ]]
elif args.closed_translation_observations:
    # Previous completed cycle snapshots and closed custody receipts only.
    paths = [base / name for name in [
        'current-d46-native-closed-deadline-evidence-manifest.json',
        'receiving-batch-live-main-13.json', 'receiving-batch-live-main-12.json',
        'current-unit-unicode-closed-deadline-retirement.json',
        'current-unit-unicode-closed-deadline-evidence-capture.json',
    ]] + [base / ('current-translation-four-rerun-live-' + str(index) + '.json')
          for index in range(1, 10)]
elif args.closed_10fd_early_observations:
    # The collector process closed. These immutable partial-cycle observations
    # do not establish that the published CI cycle has completed.
    paths = [base / name for name in [
        'current-10fd-ci-early-snapshot.json', 'current-10fd-ci-early-logs.json',
        'current-10fd-ci-early-collection.log',
    ]]
elif args.closed_4e709_terminal_snapshots:
    # Every job is terminal. One upstream log remains unavailable; preserving
    # complete metadata never changes that explicit collection failure.
    paths = [base / ('current-4e709-ci-snapshot-' + str(index) + '.json')
             for index in range(5, 13)]
    paths += [base / ('current-4e709-ci-logs-' + str(index) + '.json')
              for index in [5, 8, 10, 12]]
    assert all(json.loads(path.read_bytes()).get('headSha',
        json.loads(path.read_bytes()).get('snapshot', {}).get('headSha'))
        == '4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2' for path in paths)
elif args.closed_4e709_snapshots:
    # Completed immutable observations only; the CI cycle itself is still live.
    paths = [base / ('current-4e709-ci-snapshot-' + str(index) + '.json')
             for index in range(1, 5)]
    paths += [base / ('current-4e709-ci-logs-' + str(index) + '.json') for index in [2, 4]]
    assert all(json.loads(path.read_bytes()).get('headSha',
        json.loads(path.read_bytes()).get('snapshot', {}).get('headSha'))
        == '4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2' for path in paths)
elif args.retained_17c7_metadata:
    # Only completed-cycle observations already retained in the case study.
    # Original custody manifests keep their paths; append .gz for recovery.
    retained = root / 'docs/case-studies/issue-784/evidence/ci-17c7'
    paths = sorted(retained.glob('current-17c7-*.json'))
    paths += sorted((retained / 'current-17c7-complete-cycle').glob('*.json'))
    assert 25 <= len(paths) <= 100 and all(path.stat().st_size <= 200_000 for path in paths)
elif args.closed_raw_packet_preflight:
    paths = [base / name for name in ['current-source-origin-pr.json',
        'receiving-batch-published-runs.json', 'current-pr-conversation-10.json']]
elif args.closed_draft_observations:
    # Whole inactive diagnostic drafts, profiles and published-head observations.
    paths = [base / name for name in [
        'current-reverse-shard-cursor-draft.json', 'current-ingress-table-fixture-draft.json',
        'current-unit-unicode-source-cpu-analysis-aggregated.log', 'current-unit-unicode-profile-analysis.json',
        'current-ci-custody-commit.log', 'current-unit-unicode-receiving-node.log',
        'current-independent-generator-literal-history.json', 'receiving-batch-before-publish-pr.json',
        'current-unit-checkpoint-pr.json', 'current-named-ascii-pr.json',
    ]]
elif args.closed_matrix_custody_observations:
    # Whole closed storage receipts and old matrix observations only.
    paths = [base / name for name in [
        'matrix-draft-packet-original-receipt.json', 'matrix-draft-evidence-final.json',
        'computed-index-verified-ci-retirement.json', 'matrix-draft-postpublish-retirement.json',
        'historical-observation-gzip-retention.json', 'current-ci-duplicate-retirement.json',
        'receiving-batch-early-artifact-verification.json', 'current-owned-freeze-duplicate-retirement.json',
    ]]
elif args.closed_10fd_final_observations:
    # The entire published cycle is terminal and all 25 nonpassing logs are
    # retained. Preserve every original response byte, including job metadata.
    snapshot = json.loads((base / 'current-10fd-ci-final-snapshot.json').read_bytes())
    collection = json.loads((base / 'current-10fd-ci-final-logs.json').read_bytes())
    assert collection['completeCycleCollected'] is True
    paths = [base / name for name in [
        'current-10fd-ci-final-snapshot.json', 'current-10fd-ci-final-logs.json',
    ]]
elif args.closed_prior_cycle_observations:
    # Exact previous-cycle observations and closed logs, never producer inputs.
    paths = [root / 'ci-logs/issue-784-checkpoint-b63dd5a33' / name for name in [
        'completed-head-runs-api.json', 'completed-head-runs.json', '42430143951.json',
    ]] + [root / 'ci-logs' / name for name in [
        'restart-export-early-reverse.log', 'restart-export-complete-reverse-translation.log',
        'restart-published-reverse-translation.log',
    ]] + [base / name for name in [
        'current-profile-current-jobs.json', 'crypto-profile-current-jobs.json',
        'node-profile-cycle-status-2.json', 'receiving-batch-early-reverse-job-collection.json',
    ]] + [root / 'experiments/issue-784' / name for name in [
        'native-node-repaired.log', 'final-native-node.log',
    ]]
elif args.closed_terminal_ci_observations:
    # Whole closed historical CI observations, with no live producer inputs.
    paths = [base / name for name in [
        'current-source-origin-generate-owned-canonical.log',
        'node-profile-cycle-status.json', 'current-profile-terminal-probe.json',
        'reverse-shard-current-jobs.json', 'computed-index-current-jobs.json',
        'current-unit-unicode-closed-deadline-evidence-manifest.json',
        'owned-stage-previous-node-retirement.json', 'current-terminal-repair-pr.json',
    ]] + [root / 'ci-logs' / name for name in [
        'restart-export-capture-receipt.json', 'restart-export-evidence-manifest.json',
        'restart-published-typescript.log', 'restart-export-early-typescript.log',
        'restart-export-complete-typescript.log',
    ]] + [root / 'ci-logs/issue-784-checkpoint-b63dd5a33/missing-job-log-recovery.json']
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
