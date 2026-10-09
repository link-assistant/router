#!/usr/bin/env python3
"""Run the existing unit-suite sharder with finite memory and fresh inventory.

CI runs the original unsharded sources. This small-workspace runner uses the
repository's syntax-tree sharder and records every distinct enabled test name,
without the older runner's hard-coded inventory from a different revision.
"""

import argparse
import os
from pathlib import Path
import re
import subprocess
import sys


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=8)
    args = parser.parse_args()
    if not 0 <= args.start < args.end <= 8:
        parser.error("require 0 <= start < end <= 8")
    logs = root / "ci-logs"
    logs.mkdir(exist_ok=True)
    environment = {
        **os.environ,
        "RUSTC_WRAPPER": str(root / "experiments/issue-703/rustc_memory_wrapper.py"),
    }
    command = [
        sys.executable,
        str(root / "experiments/issue-719/bounded-build.py"),
        "cargo", "test", "--locked", "--lib", "--all-features",
    ]
    for shard in range(args.start, args.end):
        environment["RUSTC_WORKSPACE_WRAPPER"] = str(
            root / f"target/local-unit-shards/shard-{shard}.py"
        )
        print(f"Building and running unit shard {shard}", flush=True)
        for suffix, arguments in [
            ("-list", ["--list"]),
            ("", ["--test-threads=1"]),
        ]:
            with (logs / f"connector-unit-shard-{shard}{suffix}.log").open("wb") as log:
                subprocess.run(command + ["--", *arguments], cwd=root,
                               env=environment, stdout=log, stderr=log, check=True)
        print(f"Unit shard {shard} passed", flush=True)

    if args.end == 8:
        names = set()
        for shard in range(8):
            with (logs / f"connector-unit-shard-{shard}-list.log").open() as log:
                for line in log:
                    if match := re.fullmatch(r"([\w:]+): test\n", line):
                        names.add(match[1])
            with (logs / f"connector-unit-shard-{shard}.log").open() as log:
                if not any("test result: ok." in line for line in log):
                    raise RuntimeError(f"Unit shard {shard} did not pass")
        if not names:
            raise RuntimeError("Empty unit test inventory")
        with (logs / "connector-unit-test-inventory.txt").open("w") as inventory:
            inventory.writelines(f"{name}\n" for name in sorted(names))
        print(f"All {len(names)} distinct enabled unit tests passed", flush=True)


if __name__ == "__main__":
    main()
