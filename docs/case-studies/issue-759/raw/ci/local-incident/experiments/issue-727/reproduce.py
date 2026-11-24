#!/usr/bin/env python3
"""Check catalog CLI support without starting listeners or contacting providers."""
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
environment = {**os.environ, "CARGO_BUILD_JOBS": "1", "CARGO_PROFILE_DEV_DEBUG": "0", "RUSTC_WRAPPER": str(root / "experiments/issue-703/rustc_memory_wrapper.py")}
result = subprocess.run([
    "cargo", "run", "--locked", "--bin", "router", "--",
    "--model-catalog-sources", "first.json,second.json",
    "--model-catalog-refresh-secs", "30",
    "--local-model", "friendly=local:vendor-model", "--help",
], cwd=root, env=environment, capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
assert result.returncode == 0, "Router must accept model catalog configuration flags"
