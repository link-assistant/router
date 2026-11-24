#!/usr/bin/env python3
"""Verify CI inventory evidence with interleaved subprocess output."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
START = 'running 2 tests\n'
NAMES = ('test suite::first ... subprocess diagnostic\n'
         'ok\ntest suite::second ... ok\n')
SUMMARY = 'test result: ok. 2 passed; 0 failed; 0 ignored;\n'


class InventoryEvidence(unittest.TestCase):
    def check(self, log):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inventory = root / 'inventory.txt'
            inventory.write_text('suite::first\nsuite::second\n')
            ci_log = root / 'ci.log'
            ci_log.write_text(log)
            result = subprocess.run([
                sys.executable,
                str(ROOT / 'experiments/issue-703/compare-unit-test-inventories.py'),
                str(ci_log), '--local-inventory', str(inventory),
            ], capture_output=True, text=True)
            return result.returncode

    def test_interleaved_result_with_complete_passing_summary(self):
        self.assertEqual(self.check(START + NAMES + SUMMARY), 0)

    def test_failed_summary_is_rejected(self):
        failed = 'test result: FAILED. 1 passed; 1 failed; 0 ignored;\n'
        self.assertNotEqual(self.check(START + NAMES + failed), 0)

    def test_truncated_log_is_rejected(self):
        self.assertNotEqual(self.check(START + NAMES), 0)

    def test_missing_name_is_rejected(self):
        self.assertNotEqual(self.check(START + 'test suite::first ... ok\n' + SUMMARY), 0)

    def test_unexpected_name_is_rejected(self):
        self.assertNotEqual(self.check(START + NAMES + 'test suite::third ... ok\n' + SUMMARY), 0)


if __name__ == '__main__':
    unittest.main()
