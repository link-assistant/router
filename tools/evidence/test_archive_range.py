"""Focused source-only draft; run only in the coordinated engine window."""
import hashlib
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import archive_range
from archive_range import MAX_ARCHIVE, MAX_MEMBER, recover_archive_range


def sha(value):
    return hashlib.sha256(value).hexdigest()


class ArchiveRangeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        # Canonicalize only this newly created, privately owned fixture root;
        # the resolver itself never resolves away source/output symlinks.
        self.root = Path(self.temporary.name).resolve()
        self.archive = self.root / 'complete-archive.bin'
        self.content = bytes(range(256)) * 8193 + b'complete-tail'
        self.archive.write_bytes(self.content)
        self.output = self.root / 'recovered-original.bin'

    def recover(self, **changes):
        values = dict(archive_bytes=len(self.content), archive_sha256=sha(self.content),
                      offset=117, length=len(self.content) - 140,
                      range_sha256=sha(self.content[117:-23]), cap_seconds=10)
        values.update(changes)
        return recover_archive_range(self.archive, self.output, **values)

    def test_complete_multichunk_original_bytes_and_source_identity(self):
        before = self.archive.read_bytes()
        result = self.recover()
        self.assertEqual(self.output.read_bytes(), before[117:-23])
        self.assertEqual(self.archive.read_bytes(), before)
        self.assertEqual(result['sourceBefore'], result['sourceAfter'])
        self.assertTrue(result['fullArchiveVerified'])
        self.assertFalse(result['archiveDecoded'])
        self.assertFalse(result['packetAdmissionChanged'])

    def test_offset_length_and_archive_integer_bounds(self):
        for name in ('offset', 'length', 'archive_bytes'):
            for value in (True, False, -1, 1.5, '1', None):
                with self.subTest(name=name, value=value):
                    with self.assertRaises(ValueError):
                        self.recover(**{name: value})
                    self.assertFalse(self.output.exists())
        for changes in ({'offset': len(self.content) + 1, 'length': 0},
                        {'offset': len(self.content), 'length': 1},
                        {'offset': 2**100}, {'length': MAX_MEMBER + 1},
                        {'archive_bytes': MAX_ARCHIVE + 1}):
            with self.subTest(changes=changes):
                with self.assertRaises(ValueError):
                    self.recover(**changes)
                self.assertFalse(self.output.exists())

    def test_wrong_archive_even_when_selected_bytes_match(self):
        changed = bytearray(self.content)
        changed[-1] ^= 1  # Outside the selected range: its hash alone is insufficient.
        self.archive.write_bytes(changed)
        with self.assertRaisesRegex(ValueError, 'Complete archive byte/hash'):
            self.recover()
        self.assertFalse(self.output.exists())

    def test_truncated_complete_archive_refuses_before_output(self):
        self.archive.write_bytes(self.content[:-1])
        with self.assertRaisesRegex(ValueError, 'Complete archive length'):
            self.recover()
        self.assertFalse(self.output.exists())

    def test_replaced_archive_path_does_not_borrow_verified_open_inode(self):
        original_read = os.read
        replaced = False

        def read_then_replace(descriptor, count):
            nonlocal replaced
            value = original_read(descriptor, count)
            if not value and not replaced:
                replaced = True
                self.archive.rename(self.root / 'preserved-open-original')
                self.archive.write_bytes(self.content)
            return value

        with patch.object(archive_range.os, 'read', read_then_replace):
            with self.assertRaisesRegex(ValueError, 'Archive changed during complete'):
                self.recover()
        self.assertTrue(replaced)
        self.assertFalse(self.output.exists())
        self.assertEqual(self.archive.read_bytes(), self.content)
        self.assertEqual((self.root / 'preserved-open-original').read_bytes(), self.content)

    def test_changed_offset_and_length_need_their_complete_range_witness(self):
        with self.assertRaisesRegex(ValueError, 'Recovered range byte/hash'):
            self.recover(offset=118)
        self.assertEqual(self.output.read_bytes(), self.content[118:-22])
        self.output.unlink()  # Only this test's own newly created failed output.
        with self.assertRaisesRegex(ValueError, 'Recovered range byte/hash'):
            self.recover(length=len(self.content) - 141)
        self.assertEqual(self.output.read_bytes(), self.content[117:-24])

    def test_existing_output_is_never_replaced(self):
        self.output.write_bytes(b'preserved existing original')
        with self.assertRaises(FileExistsError):
            self.recover()
        self.assertEqual(self.output.read_bytes(), b'preserved existing original')

    def test_linked_sources_outputs_and_ancestors_refuse(self):
        original = self.archive
        linked = self.root / 'linked-archive'
        linked.symlink_to(original)
        self.archive = linked
        with self.assertRaises(OSError):
            self.recover()
        self.assertFalse(self.output.exists())
        self.archive = original
        for destination in (original, self.root / 'absent'):
            self.output.symlink_to(destination)
            with self.assertRaises(OSError):
                self.recover()
            self.assertTrue(self.output.is_symlink())
            self.output.unlink()
        directory = self.root / 'unlinked'
        directory.mkdir()
        alias = self.root / 'linked-directory'
        alias.symlink_to(directory, target_is_directory=True)
        self.output = alias / 'blocked-output'
        with self.assertRaises(OSError):
            self.recover()
        self.assertEqual(list(directory.iterdir()), [])
        self.archive = alias / 'input'
        (directory / 'input').write_bytes(self.content)
        self.output = self.root / 'still-not-created'
        with self.assertRaises(OSError):
            self.recover()
        self.assertFalse(self.output.exists())
        self.assertEqual(original.read_bytes(), self.content)

    def test_empty_end_range_and_malformed_witnesses(self):
        result = self.recover(offset=len(self.content), length=0, range_sha256=sha(b''))
        self.assertEqual(self.output.read_bytes(), b'')
        self.assertEqual(result['length'], 0)
        self.output.unlink()
        for changes in ({'archive_sha256': 'F' * 64}, {'range_sha256': ''},
                        {'cap_seconds': True}, {'cap_seconds': 0}, {'cap_seconds': 601}):
            with self.assertRaises(ValueError):
                self.recover(**changes)
            self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
