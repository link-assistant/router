#!/usr/bin/env python3
"""Compare generated CLI operations semantically against the default branch."""
import json
from pathlib import Path
import subprocess

path = "schemas/operation-catalog.v1.json"
old = json.loads(subprocess.check_output(["git", "show", f"origin/main:{path}"]))
new = json.loads(Path(path).read_text())
old_ops = {operation["name"]: operation for operation in old["operations"]}
new_ops = {operation["name"]: operation for operation in new["operations"]}
added = sorted(new_ops.keys() - old_ops.keys())
removed = sorted(old_ops.keys() - new_ops.keys())
changed = [name for name in old_ops if old_ops[name] != new_ops[name]]
print(f"Added operations: {added}")
print(f"Removed operations: {removed}")
print(f"Changed existing operations: {changed}")
assert added == ["accounts.policy"]
assert not removed
assert not changed
