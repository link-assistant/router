#!/usr/bin/env python3
"""Verify that bounded local shards ran exactly the ordinary Linux CI unit suite."""
import argparse
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("ci_log", type=Path)
parser.add_argument("--local-inventory", type=Path,
                    default=Path("ci-logs/unit-shards-test-inventory.txt"))
args = parser.parse_args()
local = set(args.local_inventory.read_text().splitlines())
assert local, "The local unit-test inventory must not be empty"
expected = set()
active = False
with args.ci_log.open() as log:
    for line in log:
        line = re.sub(r"\x1b\[[0-9;]*m", "", line)
        if re.search(rf"\brunning {len(local)} tests$", line.strip()):
            active = True
        elif active:
            if "test result:" in line:
                assert f"{len(local)} passed; 0 failed" in line, line
                break
            match = re.search(r"\btest ([\w:]+) \.\.\. ok$", line.strip())
            if match:
                expected.add(match.group(1))
assert active, "The CI log does not contain the corresponding unit-test suite"
assert expected == local, (
    f"Missing locally: {sorted(expected - local)}; "
    f"absent from CI: {sorted(local - expected)}"
)
print(f"All {len(local)} local unit tests exactly match the ordinary Linux CI suite")
