"""Run the genuine complete-source candidate writers in prerequisite order.

Every child uses the unchanged resource guard. Continue collecting the complete
failure set; a failed prerequisite never becomes an accepted copied closure.
This orchestration grants no source, semantic or performance authority.
"""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--label', required=True)
args = parser.parse_args()
assert args.label.replace('-', '').isalnum() and len(args.label) < 64
base = Path('ci-logs/issue-784-restart-2')
stages = [
    'operation-proof-byte-sources',
    'whole-owner-derive-candidate',
    'whole-owner-resolver-candidate',
    'whole-owner-proof-byte-candidate',
    'whole-owner-core-producer-candidate',
    'source-backed-formatting',
    'source-backed-vectors',
    'source-backed-matches',
    'core-sequence-stream-sources',
    'whole-owner-core-corpus-candidate',
    'proof-byte-core-stream-candidate',
    'batched-proof-byte-source-candidate',
]
results = []
for stage in stages:
    prefix = args.label + '-' + stage
    log = base / (prefix + '.log')
    receipt = base / (prefix + '-resource.json')
    command = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
               '--log', str(log), '--receipt', str(receipt), '--', 'node',
               'tools/translation/prepare-' + stage + '.mjs', '--write']
    result = subprocess.run(command)
    row = dict(stage=stage, exitCode=result.returncode, log=str(log),
               receipt=str(receipt) if receipt.exists() else None)
    results.append(row)
    print(json.dumps(row), flush=True)
target = base / (args.label + '-summary.json')
with target.open('x') as output:
    json.dump(dict(stages=results, allWritersPassed=all(
        row['exitCode'] == 0 for row in results),
        wholeReceivingCasesPassed=False, performanceQualified=False,
        semanticAuthority=False, runtimeParity=False), output, indent=2)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
