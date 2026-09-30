#!/usr/bin/env python3
"""Run every integration target without rebuilding the memory-heavy libtest."""
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
metadata = json.loads(subprocess.check_output(
    ["cargo", "metadata", "--no-deps", "--format-version=1"], cwd=root
))
package = next(package for package in metadata["packages"]
               if package["name"] == "link-assistant-router")
targets = sorted(target["name"] for target in package["targets"]
                 if target["kind"] == ["test"])
command = ["cargo", "test", "--locked", "--all-features"]
for target in targets:
    command += ["--test", target]
environment = dict(os.environ, CARGO_BUILD_JOBS="1", CARGO_PROFILE_DEV_DEBUG="0")
print(f"Running all {len(targets)} integration targets", flush=True)
sys.exit(subprocess.call(command, cwd=root, env=environment))
