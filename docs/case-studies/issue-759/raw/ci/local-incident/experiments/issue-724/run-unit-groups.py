#!/usr/bin/env python3
"""Run sixteen generated library groups within the fixed local memory bound.

Generate them first with ROUTER_LOCAL_UNIT_SHARDS=16 and the repository's
experiments/issue-703/shard-unit-tests.rs. Normal CI tests unmodified sources.
"""

import os
from pathlib import Path
import re
import subprocess
import sys


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    logs = root / "ci-logs"
    logs.mkdir(exist_ok=True)
    wrappers = [root / f"target/local-unit-shards/shard-{group}.py" for group in range(16)]
    if not all(path.is_file() for path in wrappers):
        raise RuntimeError("Generate all sixteen library groups before running this script")
    environment = {
        **os.environ,
        "CARGO_BUILD_JOBS": "1",
        "CARGO_PROFILE_DEV_DEBUG": "0",
        "CARGO_PROFILE_TEST_DEBUG": "0",
        "ROUTER_BUILD_RSS_LIMIT_MIB": "2400",
        "RUSTC_WRAPPER": str(root / "experiments/issue-703/rustc_memory_wrapper.py"),
    }
    # Match the default-home fixture's ordinary CI environment.
    environment.pop("CODEX_HOME", None)
    command = [
        sys.executable, str(root / "experiments/issue-719/bounded-build.py"),
        "cargo", "test", "--locked", "--lib", "--all-features",
    ]
    names = set()
    for group, wrapper in enumerate(wrappers):
        environment["RUSTC_WORKSPACE_WRAPPER"] = str(wrapper)
        print(f"Building and running unit group {group}", flush=True)
        for suffix, arguments in [("-list", ["--list"]), ("", ["--test-threads=1"])]:
            with (logs / f"admin-unit-group-{group}{suffix}.log").open("wb") as log:
                subprocess.run(command + ["--", *arguments], cwd=root, env=environment,
                               stdout=log, stderr=log, check=True)
        with (logs / f"admin-unit-group-{group}-list.log").open() as log:
            names.update(match[1] for line in log
                         if (match := re.fullmatch(r"([\w:]+): test\n", line)))
        print(f"Unit group {group} passed", flush=True)
    if not names:
        raise RuntimeError("Empty test inventory")
    (logs / "admin-unit-test-inventory.txt").write_text(
        "".join(f"{name}\n" for name in sorted(names))
    )
    print(f"All {len(names)} distinct enabled unit tests passed", flush=True)


if __name__ == "__main__":
    main()
