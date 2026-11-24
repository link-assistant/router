#!/usr/bin/env python3
"""Repeat the existing pool test executable with finite concurrent tests."""
import argparse
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("binary", type=Path)
parser.add_argument("--runs", type=int, default=20, choices=range(1, 101))
parser.add_argument("--threads", type=int, default=4, choices=range(1, 33))
parser.add_argument("--filter", default="")
parser.add_argument("--log-prefix", default="initial-round-parallel")
options = parser.parse_args()
if Path(options.log_prefix).name != options.log_prefix:
    parser.error("--log-prefix must be a filename prefix")
binary = options.binary.resolve()
environment = {**os.environ, "RUST_BACKTRACE": "1"}
failed = []
for attempt in range(options.runs):
    log = root / f"experiments/issue-724/{options.log_prefix}-{attempt:02}.log"
    with log.open("wb") as output:
        command = [str(binary)]
        if options.filter:
            command.append(options.filter)
        command += [f"--test-threads={options.threads}", "--nocapture"]
        result = subprocess.run(command,
                                cwd=root, env=environment, stdout=output,
                                stderr=subprocess.STDOUT)
    print(f"Attempt {attempt}: exit {result.returncode}, log {log.name}", flush=True)
    if result.returncode:
        failed.append(attempt)
if failed:
    print(f"FAIL: complete parallel pool runs {failed}", flush=True)
    raise SystemExit(101)
print(f"PASS: all {options.runs} complete parallel pool runs", flush=True)
