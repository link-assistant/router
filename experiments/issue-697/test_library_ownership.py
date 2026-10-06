from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[2]
class LibraryOwnership(unittest.TestCase):
    def test_binary_contains_no_operational_modules(self):
        self.assertNotIn('\nmod ', (ROOT/'src/main.rs').read_text())
        self.assertLess(len((ROOT/'src/main.rs').read_text().splitlines()), 80)
    def test_library_owns_every_operation(self):
        lib = (ROOT/'src/lib.rs').read_text()
        for module in ['auth_cli','auth_import','deploy_cli','deploy_local','deploy_remote','logs_cli','bin_doctor','recover_admin_cli','shutdown','operations','verification']:
            self.assertIn(f'pub mod {module};', lib)
if __name__ == '__main__': unittest.main()
