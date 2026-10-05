#!/usr/bin/env python3
"""Create disposable Cargo targets in Docker's empty dependency-cache stage.

Only run in an isolated manifest-only directory. Python's standard TOML parser
keeps custom target paths and future bench/test/example declarations working.
"""
import json
from pathlib import Path
import sys
import tomllib


RECORD = Path(".docker-cache-targets.json")


def targets():
    manifest = tomllib.loads(Path("Cargo.toml").read_text())
    declared = [(manifest.get("lib", {"path": "src/lib.rs"}), "src/lib.rs", "")]
    for kind, directory in [("bin", "src/bin"), ("bench", "benches"),
                            ("test", "tests"), ("example", "examples")]:
        for target in manifest.get(kind, []):
            default = f"{directory}/{target['name']}.rs"
            if kind == "bin" and target["name"] == manifest["package"]["name"]:
                default = "src/main.rs"
            declared.append((target, default, "fn main() {}\n"))
    if not manifest.get("bin"):
        declared.append(({}, "src/main.rs", "fn main() {}\n"))
    for target, default, content in declared:
        path = Path(target.get("path", default))
        if path.is_absolute() or ".." in path.parts:
            raise SystemExit(f"cache target must be a relative Rust source path: {path}")
        yield path, content


def main():
    if sys.argv[1:] == ["--clean"]:
        for filename in json.loads(RECORD.read_text()):
            Path(filename).unlink()
        RECORD.unlink()
        return
    if sys.argv[1:] == ["--touch"]:
        for path, _ in targets():
            if not path.is_file():
                raise SystemExit(f"real Cargo target is missing after source copy: {path}")
            path.touch()
        return
    if sys.argv[1:]:
        raise SystemExit("usage: docker-cache-targets.py [--clean|--touch]")
    created = []
    for path, content in targets():
        if str(path) in created:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        # Never overwrite source if someone runs this in a real checkout.
        with path.open("x") as output:
            output.write(content)
        created.append(str(path))
    RECORD.write_text(json.dumps(created))


if __name__ == "__main__":
    main()
