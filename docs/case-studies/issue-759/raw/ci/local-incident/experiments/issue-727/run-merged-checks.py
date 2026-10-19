#!/usr/bin/env python3
"""Validate a fresh main merge; keep each command's complete output for review.

Run through experiments/issue-719/bounded-build.py with a finite RSS limit.
The focused runner must first prepare shards from the current source tree.
"""
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / "ci-logs/issue-727"
ENV = {**os.environ, "CARGO_BUILD_JOBS": "1", "CARGO_PROFILE_DEV_DEBUG": "0"}
ENV.pop("CODEX_HOME", None)


def run(command, name, environment=ENV):
    print("Running " + name, flush=True)
    with (LOGS / (name + ".log")).open("wb") as log:
        subprocess.run(command, cwd=ROOT, env=environment, stdout=log,
                       stderr=log, check=True)


run(["cargo", "fmt", "--all", "--check"], "merged-format")
run(["cargo", "clippy", "--locked", "--all-targets", "--all-features", "--",
     "-D", "warnings"], "merged-clippy")
run(["rust-script", "scripts/check-file-size.rs"], "merged-file-sizes")
run(["rust-script", "scripts/check-terminology.rs"], "merged-terminology")
print("All strict merge checks passed", flush=True)

# Preserve the previous complete suite's evidence before reusing its filenames.
archive = LOGS / "before-thinking-merge"
archive.mkdir(exist_ok=True)
for pattern in ("unit-*.log", "unit-inventory.txt", "integration-*.log",
                "binary-tests.log", "doc-tests.log"):
    for path in LOGS.glob(pattern):
        if not (archive / path.name).exists():
            shutil.copy2(path, archive / path.name)
run(["python3", "experiments/issue-727/run-checks.py", "--units", "--integrations"],
    "merged-complete-suite")
run(["cargo", "doc", "--locked", "--all-features", "--no-deps"],
    "merged-rustdoc", {**ENV, "RUSTDOCFLAGS": "-D warnings"})
run(["cargo", "test", "--locked", "--all-features", "--example",
     "host_library_consumer"], "merged-host-consumer")
# The ordinary integration pass compiled this ignored test already; bound its
# finite runtime separately from the compiler's larger memory allowance.
run(["python3", "experiments/issue-719/bounded-build.py", "cargo", "test",
     "--locked", "--all-features", "--test", "soak_test", "--", "--ignored",
     "--nocapture"], "merged-soak", {**ENV, "ROUTER_BUILD_RSS_LIMIT_MIB": "768",
                                    "SOAK_SECONDS": "60", "SOAK_CONCURRENCY": "16"})
print("All combined merge validation passed", flush=True)
