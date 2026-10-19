#!/usr/bin/env python3
"""Run issue 719's hermetic fixture on machines unable to link all unit tests.

The temporary source copy retains production code and fixture helpers. Only
unrelated test modules and entry points are disabled; ordinary cargo test remains
the full validation command. Dependencies reuse the repository's target cache.
"""

import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    test_attribute = re.compile(r"#\[(?:tokio::)?test(?:\([^\]]*\))?\]")
    test_module = re.compile(
        r"#\[cfg\(test\)\](\s*(?:#\[path[^\n]*\]\s*)?(?:pub(?:\([^)]*\))?\s+)?mod\s+(\w+))"
    )
    with tempfile.TemporaryDirectory(prefix="router-719-") as temporary:
        project = Path(temporary)
        for entry in root.iterdir():
            if entry.name not in {"src", "target", ".git", "experiments", "ci-logs"}:
                (project / entry.name).symlink_to(entry, target_is_directory=entry.is_dir())
        shutil.copytree(root / "src", project / "src")
        for source in (project / "src").rglob("*.rs"):
            if source.name != "model_routing_failure_tests.rs":
                text = test_attribute.sub("#[cfg(any())]", source.read_text())
                text = test_module.sub(
                    lambda match: match.group(0)
                    if source.name == "model_routing.rs" and match.group(2) in {"tests", "evidence_tests"}
                    else "#[cfg(any())]" + match.group(1),
                    text,
                )
                source.write_text(text)
        environment = os.environ.copy()
        environment["CARGO_TARGET_DIR"] = str(root / "target")
        environment["CARGO_BUILD_JOBS"] = "1"
        environment["MALLOC_ARENA_MAX"] = "2"
        return subprocess.call(
            [
                "cargo", "test", "--locked", "--lib", "--manifest-path",
                str(project / "Cargo.toml"), "--config",
                "profile.dev.package.link-assistant-router.debug=0",
                "--config", "profile.dev.package.link-assistant-router.codegen-units=1024",
                "model_routing::evidence_tests::failure_tests", "--", "--nocapture",
            ],
            cwd=project,
            env=environment,
        )


if __name__ == "__main__":
    raise SystemExit(main())
