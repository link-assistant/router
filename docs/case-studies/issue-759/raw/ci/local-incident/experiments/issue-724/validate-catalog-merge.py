#!/usr/bin/env python3
"""Run the combined routing/catalog suite serially within existing memory bounds.

Build the current binary and generate contracts first. Each phase preserves its
complete log; --from resumes after already reviewed, successful phases.
"""
import argparse
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
environment = {
    **os.environ,
    "CARGO_TARGET_DIR": str(root / "target"),
    "CARGO_BUILD_JOBS": "1",
    "CARGO_PROFILE_DEV_DEBUG": "0",
    "CARGO_PROFILE_TEST_DEBUG": "0",
    "ROUTER_BUILD_RSS_LIMIT_MIB": "2400",
    "RUSTC_WRAPPER": str(root / "experiments/issue-703/rustc_memory_wrapper.py"),
}
bounded = [sys.executable, str(root / "experiments/issue-719/bounded-build.py")]
checks = [
    ("integrations", root, bounded + ["cargo", "test", "--locked", "--all-features",
                                    "--test", "*", "--bins"]),
    ("doctests", root, bounded + ["cargo", "test", "--locked", "--all-features", "--doc"]),
    ("strict-docs", root, bounded + ["cargo", "doc", "--locked", "--no-deps", "--all-features"]),
    ("examples", root, bounded + ["cargo", "test", "--locked", "--all-features", "--examples"]),
    ("unit-shards", root, [sys.executable, "experiments/issue-725/run-unit-shards.py",
                          "--shards", "16", "--library-only"]),
    ("contracts", root, [sys.executable, "scripts/generate-contracts.py",
                         "--binary", str(root / "target/debug/router"), "--check"]),
    ("bindings", root, [sys.executable, "scripts/generate-bindings.py", "--check"]),
    ("compatibility", root, [sys.executable, "scripts/check-contract-compatibility.py",
                             "--base", "origin/main"]),
    ("node", root / "packages/javascript", ["npm", "test"]),
    ("typescript", root / "packages/javascript", ["npm", "run", "typecheck"]),
    ("bun", root / "packages/javascript", ["bun", "test", "test/router.test.js"]),
    ("python", root / "packages/python", [sys.executable, "-m", "unittest", "discover", "-s", "tests"]),
]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--from", dest="start", choices=[name for name, _, _ in checks],
                    default=checks[0][0])
options = parser.parse_args()
checks = checks[[name for name, _, _ in checks].index(options.start):]
for name, directory, command in checks:
    child = dict(environment)
    if name == "strict-docs":
        child["RUSTDOCFLAGS"] = "-D warnings"
    if name == "examples":
        child["ROUTER_BIN"] = str(root / "target/debug/router")
    if name == "python":
        child["ROUTER_TEST_BIN"] = str(root / "target/debug/router")
    if name == "unit-shards":
        child.pop("CARGO_TARGET_DIR", None)
    print("Running combined catalog/routing " + name, flush=True)
    with (root / f"experiments/issue-724/resume-catalog-all-{name}.log").open("wb") as log:
        subprocess.run(command, cwd=directory, env=child, stdout=log,
                       stderr=subprocess.STDOUT, check=True)
    print(name + " passed", flush=True)
print("All combined catalog/routing validation passed", flush=True)
