"""Exercise Docker's manifest-only cache stage with Cargo, without dependencies."""
import pathlib
import shutil
import subprocess
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[2]
GENERATOR = REPO / "scripts/docker-cache-targets.py"


class DockerCacheTests(unittest.TestCase):
    def test_every_declared_target_and_custom_path_is_parseable(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / "Cargo.toml").write_text('''
[package]
name = "cache-repro"
version = "0.1.0"
edition = "2024"
[lib]
path = "custom/library.rs"
[[bin]]
name = "router"
path = "custom/router.rs"
[[bin]]
name = "cache-repro"
[[bin]]
name = "custom_name"
path = "custom/entrypoint"
[[bench]]
name = "hot_paths"
harness = false
[[bench]]
name = "custom_bench"
path = "custom/bench.rs"
[[test]]
name = "integration"
[[test]]
name = "custom_test"
path = "custom/test.rs"
[[example]]
name = "usage"
[[example]]
name = "custom_example"
path = "custom/example.rs"
''')
            subprocess.run(["python3", str(GENERATOR)], cwd=root, check=True)
            result = subprocess.run(
                ["cargo", "metadata", "--no-deps", "--format-version", "1"],
                cwd=root, capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            # Actual compilation catches invalid stubs, even though Docker only
            # compiles binaries and the library when caching dependencies.
            subprocess.run(["cargo", "check", "--all-targets"], cwd=root, check=True)
            subprocess.run(["python3", str(GENERATOR), "--clean"], cwd=root, check=True)
            self.assertFalse(list(root.glob("custom/*.rs")))
            self.assertFalse(list(root.glob("benches/*.rs")))
            # Model the final COPY of real targets after the cache stage.
            for path in ["custom/library.rs", "custom/router.rs", "benches/hot_paths.rs",
                         "custom/bench.rs", "tests/integration.rs", "custom/test.rs",
                         "examples/usage.rs", "custom/example.rs", "src/main.rs",
                         "custom/entrypoint"]:
                (root / path).write_text("" if path == "custom/library.rs" else "fn main() {}\n")
            subprocess.run(["python3", str(GENERATOR), "--touch"], cwd=root, check=True)
            subprocess.run(["cargo", "check", "--all-targets"], cwd=root, check=True)

    def test_current_repository_manifest_can_be_parsed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            shutil.copy(REPO / "Cargo.toml", root)
            shutil.copy(REPO / "Cargo.lock", root)
            subprocess.run(["python3", str(GENERATOR)], cwd=root, check=True)
            result = subprocess.run(
                ["cargo", "metadata", "--no-deps", "--locked", "--format-version", "1"],
                cwd=root, capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn("warning:", result.stderr)


if __name__ == "__main__":
    unittest.main()
