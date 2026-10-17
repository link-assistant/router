#!/usr/bin/env python3
"""Compare all bounded combined library tests with a complete normal Linux log."""
import argparse
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("ci_log", type=Path)
options = parser.parse_args()
local = (root / "experiments/issue-724/resume-catalog-all-unit-shards.log").read_text()
assert "Failed shards: []" in local and "Memory bound reached:" not in local
blocks = re.findall(
    r"^running (\d+) tests\n(.*?)^test result: (\w+)\. (\d+) passed; (\d+) failed; (\d+) ignored;",
    local, re.M | re.S,
)
assert len(blocks) == 16, f"Expected all sixteen successful groups, found {len(blocks)}"
names = set()
for group, (count, body, status, passed, failed, ignored) in enumerate(blocks):
    executed = set(re.findall(r"^test ([\w:]+) \.\.\.", body, re.M))
    assert status == "ok" and failed == ignored == "0", group
    assert len(executed) == int(count) == int(passed), group
    assert not names.intersection(executed), f"Duplicate tests in group {group}"
    names.update(executed)
    print(f"Group {group}: {passed} passed, zero failed or ignored")
measurements = [int(value) for value in re.findall(r"Largest child RSS observed: (\d+) KiB", local)]
assert len(measurements) == 16 and max(measurements) <= 2350 * 1024
previous = set((root / "ci-logs/thinking-local-unit-inventory.txt").read_text().splitlines())
assert previous and previous <= names, sorted(previous - names)
inventory = root / "ci-logs/catalog-local-unit-inventory.txt"
inventory.write_text("\n".join(sorted(names)) + "\n")
subprocess.run([sys.executable, str(root / "experiments/issue-703/compare-unit-test-inventories.py"),
                str(options.ci_log.resolve()), "--local-inventory", str(inventory)], cwd=root, check=True)
print(f"PASS: all {len(names)} distinct library tests exactly match normal Linux CI")
print(f"Retained all {len(previous)} previously enabled tests")
print(f"Largest child RSS: {max(measurements)} KiB; unchanged guard: {2350 * 1024} KiB")
