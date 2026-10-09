#!/usr/bin/env python3
"""Repeat the cooldown-affinity regression with finite process limits."""

import argparse
import resource
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("binary", help="Compiled pool_failover_test executable")
parser.add_argument("--repetitions", type=int, default=64)
args = parser.parse_args()
if not 1 <= args.repetitions <= 128:
    parser.error("repetitions must be between 1 and 128")

resource.setrlimit(resource.RLIMIT_AS, (1536 * 1024**2, 1536 * 1024**2))
resource.setrlimit(resource.RLIMIT_STACK, (64 * 1024**2, 64 * 1024**2))
for iteration in range(1, args.repetitions + 1):
    print(f"Iteration {iteration}/{args.repetitions}", flush=True)
    result = subprocess.run(
        [
            args.binary,
            "cases::a_session_returns_to_its_account_after_the_cooldown",
            "--exact",
            "--nocapture",
            "--test-threads=1",
        ],
        check=False,
    )
    if result.returncode:
        raise SystemExit(result.returncode)
