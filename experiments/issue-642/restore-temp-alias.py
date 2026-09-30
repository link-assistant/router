#!/usr/bin/env python3
"""Reproduce macOS /var-style temporary aliases without changing the host."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile

command = (
    ["cargo", "test", "--locked", "--all-features", "--bin", "router", "--"]
    if sys.argv[1] == "--cargo"
    else [str(Path(sys.argv[1]).resolve())]
)
tests = [
    "deploy_local::data_backup::tests::replacement_with_an_empty_inventory_cannot_revive_a_text_projection",
    "deploy_local::tests::preservation_tests::stopped_deployment_restore_checkpoints_current_state_and_keeps_new_data",
]
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    real = root / "private"
    real.mkdir()
    alias = root / "var"
    alias.symlink_to(real, target_is_directory=True)
    environment = dict(os.environ, TMPDIR=str(alias))
    for test in tests:
        result = subprocess.run(
            [*command, "--exact", test, "--nocapture"], env=environment
        )
        if result.returncode:
            sys.exit(result.returncode)
