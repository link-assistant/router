#!/usr/bin/env python3
"""Run every unit test in bounded compiler shards in a 3 GiB workspace.

First run: rust-script experiments/issue-703/shard-unit-tests.rs
CI still compiles and runs the unmodified unit suite. This local workaround
rewrites only test-function cfg attributes in an ignored source copy, using
Rust's syntax tree to avoid changing embedded strings or executable logic.
"""
import argparse
import os
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument("--start", type=int, default=0)
parser.add_argument("--end", type=int, default=8)
args = parser.parse_args()
assert 0 <= args.start < args.end <= 8
logs = root / "ci-logs"
logs.mkdir(exist_ok=True)
environment = {
    **os.environ,
    "CARGO_BUILD_JOBS": "1",
    "CARGO_PROFILE_DEV_DEBUG": "0",
    "CARGO_PROFILE_TEST_CODEGEN_UNITS": "1024",
    "RUSTC_WRAPPER": str(root / "experiments/issue-703/rustc_memory_wrapper.py"),
}
command = ["cargo", "test", "--locked", "--lib", "--all-features"]
for shard in range(args.start, args.end):
    environment["RUSTC_WORKSPACE_WRAPPER"] = str(
        root / f"target/local-unit-shards/shard-{shard}.py"
    )
    print(f"Building and listing unit shard {shard}", flush=True)
    with (logs / f"unit-shard-{shard}-list.log").open("wb") as log:
        subprocess.run(command + ["--", "--list"], cwd=root, env=environment,
                       stdout=log, stderr=log, check=True)
    with (logs / f"unit-shard-{shard}.log").open("wb") as log:
        subprocess.run(command + ["--", "--test-threads=1"], cwd=root,
                       env=environment, stdout=log, stderr=log, check=True)
    print(f"Unit shard {shard} passed", flush=True)

if args.end == 8:
    names = set()
    for shard in range(8):
        text = (logs / f"unit-shard-{shard}-list.log").read_text()
        names.update(re.findall(r"^([\w:]+): test$", text, re.MULTILINE))
        assert "test result: ok." in (logs / f"unit-shard-{shard}.log").read_text()
    # Current-head ordinary Linux CI enumerated 2,142 unit tests. Check the
    # union so shared macro-generated tests cannot hide missing coverage.
    assert len(names) == 2142, f"Unexpected unit-test coverage: {len(names)}"
    (logs / "unit-shards-test-inventory.txt").write_text("\n".join(sorted(names)) + "\n")
    print(f"All {len(names)} distinct unit tests passed locally", flush=True)
