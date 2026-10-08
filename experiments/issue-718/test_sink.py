#!/usr/bin/env python3
"""Run unchanged sink unit tests using an already-built Router library."""
from pathlib import Path
import resource
import subprocess

root = Path(__file__).resolve().parents[2]
dependencies = root / "target/debug/deps"
command = ["rustc", "--edition=2024", "--test", str(Path(__file__).with_name("sink_tests.rs")),
           "-C", "debuginfo=0", "-L", f"dependency={dependencies}",
           "-o", str(root / "target/issue-718-sink-tests")]
for name in ("link_assistant_router", "fs2", "tracing_subscriber", "url", "tempfile"):
    candidates = list(dependencies.glob(f"lib{name}-*.rlib"))
    assert candidates, f"Build Router first; missing {name}"
    library = max(candidates, key=lambda path: path.stat().st_mtime)
    command.extend(["--extern", f"{name}={library}"])

def limits():
    maximum = 4096 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (maximum, maximum))
    heap = 1024 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_DATA, (heap, heap))

subprocess.run(command, cwd=root, check=True, preexec_fn=limits)
subprocess.run([str(root / "target/issue-718-sink-tests"), "--nocapture"],
               cwd=root, check=True, preexec_fn=limits)
