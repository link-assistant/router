#!/usr/bin/env python3
"""Reproduce the CI coverage ratchet using a downloaded rust-lcov report.

Before fixing the baseline, pass --expect-update to verify the CI failure:
the checker advances a copy of the committed baseline, requiring a commit.
Without that flag, verify the committed value leaves the copy unchanged.
"""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / 'ci-logs/issue-727'
parser = argparse.ArgumentParser(__doc__)
parser.add_argument('report', type=Path)
parser.add_argument('--expect-update', action='store_true')
args = parser.parse_args()
LOGS.mkdir(parents=True, exist_ok=True)
lines = json.loads(args.report.read_text())['data'][-1]['totals']['lines']
before = (ROOT / 'coverage-baseline.txt').read_text()
baseline = LOGS / 'reproduction-baseline.txt'
baseline.write_text(before)
previous = LOGS / 'main-baseline.txt'
previous.write_bytes(subprocess.check_output(
    ['git', 'show', 'origin/main:coverage-baseline.txt'], cwd=ROOT))
name = 'coverage-before' if args.expect_update else 'coverage-after'
with (LOGS / (name + '.log')).open('wb') as log:
    subprocess.run([
        'rust-script', 'scripts/check-coverage.rs',
        '--report', str(args.report.resolve()), '--baseline', str(baseline),
        '--previous-baseline', str(previous),
    ], cwd=ROOT, stdout=log, stderr=log, check=True)
after = baseline.read_text()
changed = before != after
assert changed == args.expect_update, (before, after, args.expect_update)
if changed:
    assert after == f"{lines['percent']:.6f}\n", (after, lines)
    print(f'CI reviewability failure reproduced: {before.strip()} -> {after.strip()}')
else:
    print(f'Coverage gate preserves committed baseline {after.strip()}')
print(f"Measured {lines['covered']} / {lines['count']} covered lines")
