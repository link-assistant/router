#!/usr/bin/env python3
"""Exercise the real release script through a credential-free, stateful gh fixture."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
RUST_SCRIPT = shutil.which("rust-script")
DUPLICATE = {
    "message": "Validation Failed",
    "errors": [{"resource": "Release", "code": "already_exists", "field": "tag_name"}],
    "status": "422",
}

GH = r'''#!/usr/bin/env python3
import json
import os
from pathlib import Path
import sys

root = Path(os.environ["RELEASE_FIXTURE"])
config = json.loads((root / "config.json").read_text())
args = sys.argv[1:]
post = ["api", "repos/fixture/router/releases", "-X", "POST", "--input", "-"]
get = ["api", "repos/fixture/router/releases/tags/v1.18.1"]
assert args in [post, get], args
with (root / "calls.jsonl").open("a") as calls:
    calls.write(json.dumps(args) + "\n")
state = root / "release.json"
if args == post:
    payload = json.load(sys.stdin)
    assert payload["tag_name"] == "v1.18.1", payload
    assert payload["prerelease"] is True, payload
    assert payload["make_latest"] == "false", payload
    failure = config.get("post_error")
    if failure or state.exists():
        print(json.dumps(failure or config["duplicate"]))
        print(config.get("stderr", "gh: Validation Failed (HTTP 422)"), file=sys.stderr)
        sys.exit(1)
    payload.update(id=123, assets=[{"name": "existing.tar.gz", "digest": "sha256:keep"}])
    state.write_text(json.dumps(payload))
    print(json.dumps(payload))
else:
    if config.get("get_error"):
        print(json.dumps(config["get_error"]))
        print("gh: lookup failed", file=sys.stderr)
        sys.exit(1)
    print(json.dumps(config.get("get_release") or json.loads(state.read_text())))
'''


class ReleasePreparation(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="release-preparation-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        fixture = self.directory / "gh"
        fixture.write_text(GH)
        fixture.chmod(0o700)
        self.config = {"duplicate": DUPLICATE}
        self.environment = os.environ.copy()
        for key in ("GH_TOKEN", "GITHUB_TOKEN", "RELEASE_VERSION", "REPOSITORY"):
            self.environment.pop(key, None)
        self.environment.update(
            PATH=str(self.directory) + os.pathsep + os.environ["PATH"],
            RELEASE_FIXTURE=str(self.directory),
        )

    def prepare(self):
        (self.directory / "config.json").write_text(json.dumps(self.config))
        return subprocess.run(
            [RUST_SCRIPT, str(ROOT / "scripts/create-github-release.rs"),
             "--release-version", "1.18.1", "--repository", "fixture/router",
             "--prerelease", "true"],
            cwd=self.directory, env=self.environment, capture_output=True, text=True,
            check=False,
        )

    def calls(self):
        return [json.loads(line) for line in
                (self.directory / "calls.jsonl").read_text().splitlines()]

    def test_main_preparation_then_exact_tag_publication_preserves_release(self):
        first = self.prepare()
        self.assertEqual(first.returncode, 0, first.stderr)
        before = (self.directory / "release.json").read_bytes()
        second = self.prepare()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual((self.directory / "release.json").read_bytes(), before)
        self.assertEqual(len(self.calls()), 3)
        self.assertEqual(self.calls()[-1],
                         ["api", "repos/fixture/router/releases/tags/v1.18.1"])

    def test_existing_stable_release_is_neither_demoted_nor_modified(self):
        state = self.directory / "release.json"
        state.write_text(json.dumps({"tag_name": "v1.18.1", "id": 123,
                                     "prerelease": False, "assets": [{"name": "keep"}]}))
        before = state.read_bytes()
        result = self.prepare()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(state.read_bytes(), before)

    def test_ordinary_failures_never_count_as_duplicate_success(self):
        failures = [
            {"message": "Validation Failed", "status": "422"},
            {"message": "Bad credentials", "status": "401"},
            {"message": "Resource not accessible", "status": "403"},
            {"message": "network failure"},
            {"message": "already exists"},
            {**DUPLICATE, "status": "401"},
            {**DUPLICATE, "errors": [{"resource": "Release", "code": "invalid",
                                      "field": "body"}]},
            {**DUPLICATE, "errors": [{"resource": "Release", "code": "already_exists",
                                      "field": "name"}]},
            {**DUPLICATE, "errors": DUPLICATE["errors"] + [
                {"resource": "Release", "code": "invalid", "field": "body"}]},
        ]
        for failure in failures:
            with self.subTest(failure=failure):
                self.config.update(post_error=failure, stderr="gh: request failed; already exists")
                result = self.prepare()
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertIn("Error creating release", result.stderr)
        self.assertTrue(all("POST" in call for call in self.calls()))

    def test_duplicate_requires_a_successful_exact_tag_lookup(self):
        for error in ({"message": "Not Found", "status": "404"},
                      {"message": "Bad credentials", "status": "401"},
                      {"message": "Forbidden", "status": "403"}):
            with self.subTest(error=error):
                self.config.update(post_error=DUPLICATE, get_error=error)
                result = self.prepare()
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertIn("lookup", result.stderr)

    def test_a_lookup_for_a_different_tag_is_rejected(self):
        self.config.update(post_error=DUPLICATE,
                           get_release={"tag_name": "v1.18.0", "id": 123})
        result = self.prepare()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("v1.18.1", result.stderr)

    def test_a_lookup_with_missing_release_identity_is_rejected(self):
        self.config.update(post_error=DUPLICATE, get_release={"tag_name": "v1.18.1"})
        result = self.prepare()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("exact-tag", result.stderr)


if __name__ == "__main__":
    if not RUST_SCRIPT:
        raise SystemExit("rust-script is required; install the repository's pinned version 0.36.0")
    unittest.main(verbosity=2)
