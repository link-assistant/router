"""Run release regressions against Windows-style workflow line endings."""
import os
from pathlib import Path
import subprocess
import unittest

REPO = Path(__file__).resolve().parents[2]


class WorkflowLineEndingsTests(unittest.TestCase):
    def test_release_checks_accept_crlf(self):
        workflow = REPO / ".github/workflows/release.yml"
        original = workflow.read_bytes()
        environment = os.environ.copy()
        environment.update({
            "CARGO_INCREMENTAL": "0",
            "CARGO_BUILD_JOBS": "1",
            "CARGO_PROFILE_DEV_DEBUG": "0",
            "CARGO_PROFILE_TEST_DEBUG": "0",
        })
        try:
            workflow.write_bytes(original.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))
            result = subprocess.run(
                ["cargo", "test", "--locked", "--test", "release_workflow_test",
                 "--test", "release_gate_test"],
                cwd=REPO, env=environment, capture_output=True, text=True,
            )
        finally:
            workflow.write_bytes(original)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
