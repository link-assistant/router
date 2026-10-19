#!/usr/bin/env python3
"""Verify the clock-controlled regression catches lost initial retry rounds."""
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
source = root / "src/account_policy_dispatch.rs"
original = source.read_text()
needle = "    budget.consume_rounds(scope.retry_rounds_used);"
assert original.count(needle) == 1
mutated = original.replace(needle, "    // Experiment: discard the initial retry round.")
environment = os.environ.copy()
environment.update(
    CARGO_TARGET_DIR=str(root / "target"),
    CARGO_BUILD_JOBS="1",
    CARGO_PROFILE_DEV_DEBUG="0",
    CARGO_PROFILE_TEST_DEBUG="0",
    ROUTER_BUILD_RSS_LIMIT_MIB="2400",
    RUSTC_WRAPPER=str(root / "experiments/issue-703/rustc_memory_wrapper.py"),
)
command = [
    "python3", "experiments/issue-719/bounded-build.py", "cargo", "test",
    "--locked", "--all-features", "--test", "pool_failover_test",
]
test = "account_policies::an_initial_policy_cooldown_wait_consumes_the_retry_round"


def run(name, arguments):
    path = root / f"experiments/issue-724/{name}.log"
    with path.open("w") as output:
        result = subprocess.run(command + arguments, cwd=root, env=environment,
                                stdout=output, stderr=subprocess.STDOUT)
    print(name, "exit", result.returncode, flush=True)
    return result.returncode, path.read_text()


try:
    code, _ = run("initial-round-clock-green", [test, "--", "--exact", "--nocapture"])
    assert code == 0, "clock-controlled fixture must pass before mutation"
    source.write_text(mutated)
    code, log = run("initial-round-clock-red", [test, "--", "--exact", "--nocapture"])
    assert code == 101 and 'left: ["primary", "primary"]' in log, log[-2500:]
    print("PASS: losing the consumed round reproduces the extra upstream call", flush=True)
finally:
    current = source.read_text()
    if current == mutated:
        source.write_text(original)
    else:
        assert current == original, "source changed during the experiment; left it untouched"

code, _ = run("initial-round-clock-full-pool", ["--", "--nocapture"])
assert code == 0, "all pool regressions must pass after restoration"
print("PASS: original production source restored; full pool suite passes", flush=True)
