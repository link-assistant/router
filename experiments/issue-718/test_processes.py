#!/usr/bin/env python3
"""Run current process regressions against already compiled Router binaries."""
import os
import json
from pathlib import Path
import resource
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
dependencies = root / "target/debug/deps"
library = max(dependencies.glob("liblink_assistant_router-*.rlib"),
              key=lambda path: path.stat().st_mtime)
cutoff = library.stat().st_mtime
fingerprints = root / "target/debug/.fingerprint"
metadata = json.loads((fingerprints / library.name.removeprefix("lib").removesuffix(".rlib").replace("link_assistant_router", "link-assistant-router") / "lib-link_assistant_router.json").read_text())
selected = {name: value.to_bytes(8, "little").hex() for _, name, _, value in metadata["deps"]}
environment = os.environ.copy()
for name in ("router", "with-router", "link-assistant-router"):
    binary = root / "target/debug" / name
    assert binary.is_file(), f"Build {name} first"
    environment[f"CARGO_BIN_EXE_{name}"] = str(binary)
    print(f"Using {binary} (built {binary.stat().st_mtime})", flush=True)

externs = []
for name in ("link_assistant_router", "base64", "serde_json", "tempfile", "wait_timeout", "portable_pty"):
    candidates = []
    if name in selected:
        for fingerprint in fingerprints.glob(f"*/lib-{name}"):
            if fingerprint.read_text().strip() == selected[name]:
                artifact = dependencies / f"lib{name}-{fingerprint.parent.name.rsplit('-', 1)[1]}.rlib"
                if artifact.is_file():
                    candidates.append(artifact)
    else:
        candidates = [path for path in dependencies.glob(f"lib{name}-*.rlib")
                      if path.stat().st_mtime <= cutoff]
    dependency = max(candidates, key=lambda path: path.stat().st_mtime)
    externs.extend(["--extern", f"{name}={dependency}"])

def limits():
    resource.setrlimit(resource.RLIMIT_AS, (4 * 1024**3, 4 * 1024**3))
    resource.setrlimit(resource.RLIMIT_DATA, (1024**3, 1024**3))

for name in sys.argv[1:] or ("operational_logging_test", "with_router_test", "shutdown_signal_test"):
    output = root / "target" / f"issue-718-{name}"
    subprocess.run(["rustc", "--edition=2024", "--test", str(root / "tests" / f"{name}.rs"),
                    "-C", "debuginfo=0", "-C", "link-arg=-Wl,--threads=1",
                    "-L", f"dependency={dependencies}", *externs,
                    "-o", str(output)], env=environment, cwd=root, check=True, preexec_fn=limits)
    subprocess.run([str(output), "--test-threads=2", "--nocapture"],
                   env=environment, cwd=root, check=True, preexec_fn=limits)
