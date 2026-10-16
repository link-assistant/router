"""Exercise release detection in a temporary repository, without changing HEAD."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

script = Path(__file__).resolve().parents[2] / 'scripts/declared-release-type.py'
spec = importlib.util.spec_from_file_location('release_type', script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleaseTypeTest(unittest.TestCase):
    def test_only_new_major_fragments_allow_breaking_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            previous = os.getcwd()
            os.chdir(directory)
            try:
                subprocess.run(['git', 'init', '-q'], check=True)
                Path('changelog.d').mkdir()
                Path('changelog.d/old.md').write_text('---\nbump: major\n---\n')
                subprocess.run(['git', 'add', '.'], check=True)
                subprocess.run(['git', '-c', 'user.name=Test', '-c',
                                'user.email=test@example.com', 'commit', '-qm', 'base'], check=True)
                self.assertEqual(module.release_type('HEAD'), 'minor')
                Path('changelog.d/new.md').write_text('---\nbump: minor\n---\n')
                subprocess.run(['git', 'add', '.'], check=True)
                self.assertEqual(module.release_type('HEAD'), 'minor')
                Path('changelog.d/new.md').write_text('---\nbump: major\n---\n')
                self.assertEqual(module.release_type('HEAD'), 'major')
            finally:
                os.chdir(previous)


if __name__ == '__main__':
    unittest.main()
