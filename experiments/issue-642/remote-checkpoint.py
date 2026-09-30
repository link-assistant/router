#!/usr/bin/env python3
"""Finite disposable tests of the exact remote checkpoint payload (no Docker)."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

SOURCE = Path(__file__).resolve().parents[2] / "src/deploy/data_checkpoint.js"


def exercise(case):
    with tempfile.TemporaryDirectory(prefix="router-checkpoint-") as temporary:
        root = Path(temporary) / "data"
        root.mkdir()
        (root / "projects").mkdir()
        (root / "projects/state.json").write_text('{"session":"retained"}')
        (root / "projects/oauth_creds.json").write_text("rotating-test-only")
        (root / "providers.lenv").write_bytes(b"encrypted-static-fixture")
        bin_dir = Path(temporary) / "bin"
        bin_dir.mkdir()
        router = bin_dir / "router"
        router.write_text("#!/bin/sh\nprintf '%s\\n' '[]'\n")
        router.chmod(0o700)
        if case == "symlink":
            (root / "projects/link").symlink_to(root / "projects/state.json")
        elif case == "special":
            os.mkfifo(root / "projects/pipe")
        elif case == "invalid-tokens":
            router.write_text("#!/bin/sh\nprintf '%s\\n' '{}'\n")
        elif case == "depth":
            nested = root / "projects"
            for _ in range(34):
                nested /= "one"
            nested.mkdir(parents=True)
            (nested / "state").write_text("finite")
        script = Path(temporary) / "checkpoint.cjs"
        script.write_text(SOURCE.read_text().replace(
            "const root = '/data/router';", "const root = " + json.dumps(str(root)) + ";"
        ))
        result = subprocess.run(
            ["node", "--max-old-space-size=96", str(script)],
            env={"PATH": str(bin_dir) + os.pathsep + os.environ["PATH"],
                 "TOKEN_SECRET": "disposable-test-only"},
            capture_output=True, check=False,
        )
        manifests = list(root.glob(".state-backups/*/manifest.json"))
        if case != "valid":
            assert result.returncode != 0, case
            assert not manifests, "a partial checkpoint must not be published"
            return
        assert result.returncode == 0, result.stderr.decode()
        report = json.loads(result.stdout)
        assert report["oauth_copied"] is False
        snapshot = Path(report["checkpoint"])
        manifest = json.loads((snapshot / "manifest.json").read_text())
        assert manifest["signing_secret_sha256"] == hashlib.sha256(
            b"disposable-test-only").hexdigest()
        assert set(manifest["files"]) == {
            "tokens.json", "providers.lenv", "projects/state.json"}
        for relative, digest in manifest["files"].items():
            path = snapshot / relative
            assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
            assert path.stat().st_mode & 0o777 == 0o600
        assert snapshot.stat().st_mode & 0o777 == 0o700
        assert not (snapshot / "projects/oauth_creds.json").exists()


for case in ["valid", "symlink", "special", "invalid-tokens", "depth"]:
    exercise(case)
    print(case + ": passed")
print("Remote checkpoint payload contracts passed; remote cutover remains a separate live test.")
