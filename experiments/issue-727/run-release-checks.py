#!/usr/bin/env python3
"""Recheck release-sensitive consumers after a metadata-only main merge.

Run the complete source suite first. Run this driver through bounded-build.py
with the existing rustc memory wrapper and a finite compiler RSS allowance.
"""
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / "ci-logs/issue-727"
LOGS.mkdir(parents=True, exist_ok=True)
ENV = {**os.environ, "CARGO_BUILD_JOBS": "1", "CARGO_PROFILE_DEV_DEBUG": "0"}
ENV.pop("CODEX_HOME", None)


def run(command, name, environment=ENV, directory=ROOT):
    print("Running " + name, flush=True)
    with (LOGS / ("release-" + name + ".log")).open("wb") as log:
        subprocess.run(command, cwd=directory, env=environment, stdout=log,
                       stderr=log, check=True)


run(["cargo", "build", "--locked", "--all-features", "--bins"], "build")
run(["python3", "scripts/generate-contracts.py", "--check"], "contracts")
run(["python3", "scripts/generate-bindings.py", "--check"], "bindings")
run(["python3", "scripts/check-contract-compatibility.py", "--base",
     "origin/main"], "contract-compatibility")
run(["cargo", "fmt", "--all", "--check"], "format")
run(["cargo", "clippy", "--locked", "--all-targets", "--all-features", "--",
     "-D", "warnings"], "clippy")
run(["rust-script", "scripts/check-file-size.rs"], "file-sizes")
run(["rust-script", "scripts/check-terminology.rs"], "terminology")
run(["python3", "experiments/issue-727/run-focused.py", "--tests-only",
     "--auth-tests"], "focused")
for target in [
    "public_api_compat_test", "model_catalog_compatibility_test",
    "provider_connector_conformance_test", "release_packaging_test",
    "contract_inventory_test", "cli_contract_test", "observability_test",
    "management_security_test", "thinking_account_policy_test",
    "thinking_evidence_test", "thinking_matrix_test", "thinking_parser_test",
    "thinking_pipeline_test", "router_e2e_test",
]:
    run(["cargo", "test", "--locked", "--all-features", "--test", target],
        target)
run(["cargo", "doc", "--locked", "--all-features", "--no-deps"],
    "rustdoc", {**ENV, "RUSTDOCFLAGS": "-D warnings"})
run(["cargo", "test", "--locked", "--all-features", "--example",
     "host_library_consumer"], "host-consumer")
run(["python3", "experiments/issue-719/bounded-build.py", "cargo", "test",
     "--locked", "--all-features", "--test", "soak_test", "--", "--ignored",
     "--nocapture"], "soak", {**ENV, "ROUTER_BUILD_RSS_LIMIT_MIB": "768",
                              "SOAK_SECONDS": "60", "SOAK_CONCURRENCY": "16"})
run(["npm", "test"], "node", directory=ROOT / "packages/javascript")
run(["npm", "run", "typecheck"], "typescript",
    directory=ROOT / "packages/javascript")
run(["bun", "test", "test"], "bun", directory=ROOT / "packages/javascript")
run([str(ROOT / ".venv/bin/python"), "-m", "unittest", "discover", "-s",
     "packages/python/tests", "-v"], "python")
run(["bash", "scripts/generate-http-clients.sh"], "generate-http-clients")
run(["bash", "scripts/test-http-clients.sh"], "http-clients")
run(["rust-script", "--test", "scripts/check-coverage.rs"], "coverage-checker")
run(["python3", "experiments/issue-727/test-unit-inventory-parser.py"],
    "unit-inventory-parser")
print("All release-sensitive consumers passed", flush=True)
