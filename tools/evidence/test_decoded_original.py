import copy
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import decoded_original as decoded


def sha(data):
    return hashlib.sha256(data).hexdigest()


class DecodedOriginalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='router-gzip-decoded-')
        self.repo = Path(self.temp.name).resolve()
        self.case = self.repo / 'docs/case-studies/issue-759'
        self.case.mkdir(parents=True)
        self.raw = bytes(range(256)) * 4097 + b'\x00\xff\r\nexact raw tail'
        self.gzip = gzip.compress(self.raw, mtime=0)
        self.archive_name = 'raw/complete.tar.xz'
        self.member = 'original.json.gz'
        self.archive = self.case / self.archive_name
        self.archive.parent.mkdir()
        self.logical = 'decoded/complete-original.raw'
        self.target = self.repo / 'fresh-original.raw'
        self.packet_index = self.case / 'packet-git-index.json'
        self.index_path = self.case / 'packet-decoded-original-index.json'
        self.receipt_path = self.case / 'capture.json'
        self.pack()
        self.git('init', '-q')
        self.publish('complete original packet')
        self.staging = patch('tempfile.gettempdir', return_value=str(self.repo))
        self.staging.start()

    def tearDown(self):
        self.staging.stop()
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.check_output(
            ['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false', *args],
            cwd=self.repo, timeout=10, stderr=subprocess.DEVNULL,
            env={**os.environ, 'GIT_AUTHOR_NAME': 'Fixture',
                 'GIT_AUTHOR_EMAIL': 'fixture@example.invalid',
                 'GIT_COMMITTER_NAME': 'Fixture',
                 'GIT_COMMITTER_EMAIL': 'fixture@example.invalid'})

    def pack(self, extra=None, target_link=False):
        self.members = []
        with tarfile.open(self.archive, 'w:xz', preset=0) as tar:
            item = tarfile.TarInfo('unrequested.txt')
            data = b'complete unrequested evidence'
            item.size = len(data)
            tar.addfile(item, io.BytesIO(data))
            self.members.append({'path': item.name, 'bytes': len(data), 'sha256': sha(data)})
            name = 'original-source.gz' if target_link else self.member
            item = tarfile.TarInfo(name)
            item.size = len(self.gzip)
            tar.addfile(item, io.BytesIO(self.gzip))
            self.members.append({'path': name, 'bytes': len(self.gzip), 'sha256': sha(self.gzip)})
            if target_link:
                item = tarfile.TarInfo(self.member)
                item.type, item.linkname = tarfile.LNKTYPE, name
                tar.addfile(item)
                self.members.append({'path': self.member, 'bytes': len(self.gzip), 'sha256': sha(self.gzip)})
            if extra:
                item = tarfile.TarInfo('undeclared.txt')
                item.size = 1
                tar.addfile(item, io.BytesIO(b'x'))

    def publish(self, message):
        self.git('add', '.')
        self.git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', message)
        head = self.git('rev-parse', 'HEAD').decode().strip()
        git_path = 'docs/case-studies/issue-759/' + self.archive_name
        self.blob = self.git('rev-parse', head + ':' + git_path).decode().strip()
        body = self.archive.read_bytes()
        self.archive_body = body
        self.packet = {'schema': 'complete-packet-git-index-v1', 'archives': {
            self.archive_name: {'bytes': len(body), 'sha256': sha(body), 'git': {
                'commit': head, 'path': git_path, 'blob': self.blob}}}}
        self.packet_index.write_text(json.dumps(self.packet))
        self.receipt = {'schema': 'complete-evidence-packet-v1',
                        'archiveBytes': len(body), 'archiveSha256': sha(body),
                        'completeMembers': len(self.members),
                        'completeOriginalBytes': sum(row['bytes'] for row in self.members),
                        'members': self.members}
        self.write_receipt()

    def write_receipt(self):
        raw = json.dumps(self.receipt).encode()
        self.receipt_path.write_bytes(raw)
        self.row = {'archive': self.archive_name, 'member': self.member, 'codec': 'gzip',
                    'gzipBytes': len(self.gzip), 'gzipSha256': sha(self.gzip),
                    'bytes': len(self.raw), 'sha256': sha(self.raw),
                    'membersReceipt': {'path': 'capture.json', 'bytes': len(raw), 'sha256': sha(raw)}}
        self.index = {'schema': 'complete-packet-gzip-decoded-index-v1',
                      'objects': {self.logical: self.row}}
        self.write_index()

    def write_index(self, value=None):
        self.index_path.write_text(json.dumps(self.index if value is None else value))

    def recover(self, **kwargs):
        return decoded.recover_gzip_decoded_original(
            self.case, self.repo, self.logical, self.target, cap_seconds=15, **kwargs)

    def test_every_raw_byte_present_and_absent_git_recovery(self):
        physical = self.case / self.logical
        physical.parent.mkdir()
        physical.write_bytes(self.raw)
        (self.case / self.member).write_bytes(self.gzip)
        for present in (True, False):
            if not present:
                self.archive.unlink()
                physical.unlink()
                (self.case / self.member).unlink()
            result = self.recover()
            self.assertEqual(self.target.read_bytes(), self.raw)  # EVERY byte.
            self.assertEqual(result['allPacketMembersVerified']['completeMembers'], 2)
            self.assertEqual(result['gzipSha256'], sha(self.gzip))
            self.assertEqual(result['physicalOriginalPresentAndVerified'], present)
            self.assertEqual(result['physicalGzipPresentAndVerified'], present)
            self.assertFalse(result['existingCiDecoderBoundsChanged'])
            self.target.unlink()
            self.assertEqual(list(self.repo.glob('complete-packet-range-*')), [])

    def test_whole_binary_payload_without_json_or_text_interpretation(self):
        self.raw = b'not JSON\x00\xff\xed\xa0\x80' * 1024
        self.gzip = gzip.compress(self.raw, mtime=0)
        self.pack()
        self.publish('opaque nontext original')
        self.recover()
        self.assertEqual(self.target.read_bytes(), self.raw)

    def test_empty_encoded_input_is_not_a_gzip_frame(self):
        self.raw, self.gzip = b'', b''
        self.pack()
        self.publish('empty encoded bytes are not gzip')
        with self.assertRaisesRegex(ValueError, 'nonempty encoded'):
            self.recover()
        self.assertFalse(self.target.exists())

    def test_genuine_gzip_frame_can_decode_an_empty_original(self):
        self.raw = b''
        self.gzip = gzip.compress(self.raw, mtime=0)
        self.pack()
        self.publish('genuine gzip frame for empty raw original')
        result = self.recover()
        self.assertEqual(self.target.read_bytes(), b'')
        self.assertGreater(result['gzipBytes'], 0)
        self.assertEqual(result['sha256'], sha(b''))

    def test_fresh_output_and_symlink_controls(self):
        self.target.write_bytes(b'preserved existing output')
        with self.assertRaises(FileExistsError):
            self.recover()
        self.assertEqual(self.target.read_bytes(), b'preserved existing output')
        self.target.unlink()
        kept = self.repo / 'kept.bin'
        kept.write_bytes(b'kept')
        self.target.symlink_to(kept)
        with self.assertRaises(OSError):
            self.recover()
        self.assertEqual(kept.read_bytes(), b'kept')

    def test_corrupt_physical_overlay_never_bypasses_git(self):
        self.archive.write_bytes(self.archive_body + b'changed')
        with self.assertRaisesRegex(ValueError, 'Physical'):
            self.recover()
        self.assertFalse(self.target.exists())

    def test_present_archive_cannot_replace_missing_or_wrong_git_witness(self):
        for field in ('commit', 'blob'):
            changed = copy.deepcopy(self.packet)
            changed['archives'][self.archive_name]['git'][field] = 'f' * 40
            self.packet_index.write_text(json.dumps(changed))
            with self.assertRaises(ValueError):
                self.recover()
            self.assertFalse(self.target.exists())
        self.packet_index.write_text(json.dumps(self.packet))

    def test_complete_unrequested_member_is_verified(self):
        self.receipt['members'][0]['sha256'] = 'f' * 64
        self.write_receipt()
        with self.assertRaisesRegex(ValueError, 'member byte/hash'):
            self.recover()
        self.assertFalse(self.target.exists())

    def test_source_gzip_and_raw_witness_changes_refuse(self):
        for field, value in [('gzipSha256', 'f' * 64), ('gzipBytes', len(self.gzip) + 1),
                             ('member', 'absent.gz')]:
            index = copy.deepcopy(self.index)
            index['objects'][self.logical][field] = value
            self.write_index(index)
            with self.assertRaisesRegex(ValueError, 'member witness'):
                self.recover()
            self.assertFalse(self.target.exists())
        self.write_index()
        self.row['sha256'] = 'f' * 64
        self.write_index()
        with self.assertRaisesRegex(ValueError, 'decoded original byte/hash'):
            self.recover()
        self.assertEqual(self.target.read_bytes(), self.raw)

    def test_truncated_gzip_and_crc_error_retain_failed_output(self):
        original = self.gzip
        for bad in (original[:-4], original[:-8] + b'\x00' * 8):
            self.gzip = bad
            self.pack()
            self.publish('authentic but invalid gzip ' + str(len(bad)))
            with self.assertRaises((OSError, EOFError)):
                self.recover()
            self.assertTrue(self.target.exists())
            self.target.unlink()

    def test_raw_expansion_stops_at_declared_bound(self):
        self.row['bytes'] = 7
        self.row['sha256'] = sha(self.raw[:7])
        self.write_index()
        with self.assertRaisesRegex(ValueError, 'raw bound'):
            self.recover()
        self.assertLessEqual(self.target.stat().st_size, 7)

    def test_strict_schema_and_unknown_codec_or_recipe_fields(self):
        for change in ({'codec': 'xz'}, {'command': 'execute'}, {'bytes': True},
                       {'gzipBytes': -1}, {'bytes': decoded.MAX_RAW + 1},
                       {'archive': '../escape'}, {'member': 'a\n.gz'},
                       {'gzipSha256': 'F' * 64}):
            index = copy.deepcopy(self.index)
            index['objects'][self.logical].update(change)
            self.write_index(index)
            with self.assertRaises(ValueError):
                self.recover()
            self.assertFalse(self.target.exists())

    def test_duplicate_keys_nonfinite_and_overwide_indices(self):
        raw = json.dumps(self.index)
        for changed in (raw.replace('"schema":', '"schema":"x","schema":', 1),
                        raw.replace('"codec": "gzip"', '"codec": NaN'),
                        raw.replace('"codec": "gzip"', '"codec": Infinity'),
                        '{"schema":"x","objects":{}}' + ' ' * decoded.MAX_INDEX):
            self.index_path.write_text(changed)
            with self.assertRaises(ValueError):
                self.recover()

    def test_hardlinked_source_is_not_a_new_decoding_alias(self):
        self.pack(target_link=True)
        self.publish('valid ordinary backward link')
        with self.assertRaisesRegex(ValueError, 'direct regular gzip'):
            self.recover()

    def test_input_replacement_during_recovery_refuses(self):
        old_decode = decoded._decode
        def replace(*args):
            result = old_decode(*args)
            self.index_path.rename(self.case / 'retained-old-index.json')
            self.write_index()
            return result
        with patch.object(decoded, '_decode', replace):
            with self.assertRaisesRegex(ValueError, 'metadata changed'):
                self.recover()
        self.assertEqual(self.target.read_bytes(), self.raw)

    def test_output_path_replacement_refuses(self):
        old_decode = decoded._decode
        def replace(*args):
            result = old_decode(*args)
            self.target.rename(self.repo / 'retained-full-output.raw')
            self.target.write_bytes(self.raw)
            return result
        with patch.object(decoded, '_decode', replace):
            with self.assertRaisesRegex(ValueError, 'output path/identity'):
                self.recover()

    def test_source_stage_replacement_refuses(self):
        old_decode = decoded._decode
        def replace(*args):
            result = old_decode(*args)
            stage = next(self.repo.glob('complete-packet-range-*'))
            stage.rename(self.repo / 'retained-stage.xz')
            stage.write_bytes(self.archive_body)
            return result
        with patch.object(decoded, '_decode', replace):
            with self.assertRaisesRegex(ValueError, 'staging source changed'):
                self.recover()

    def test_symlinked_index_receipt_and_parent_refuse(self):
        for source in (self.index_path, self.receipt_path):
            retained = source.with_suffix('.retained')
            source.rename(retained)
            source.symlink_to(retained)
            with self.assertRaises(OSError):
                self.recover()
            source.unlink()
            retained.rename(source)
        parent = self.repo / 'linked-output-directory'
        parent.symlink_to(self.repo, target_is_directory=True)
        with self.assertRaises(OSError):
            decoded.recover_gzip_decoded_original(self.case, self.repo, self.logical,
                                                  parent / 'new.raw', cap_seconds=15)

    def test_invalid_deadlines_and_elapsed_full_member_audit(self):
        for cap in (True, 0, 171, 1.5):
            with self.assertRaisesRegex(ValueError, 'deadline'):
                decoded.recover_gzip_decoded_original(self.case, self.repo, self.logical,
                                                      self.target, cap_seconds=cap)
        original = decoded._DeadlinePacketStore.verify_members
        clock = {'after': False}
        now = decoded.time.monotonic()
        def audit(*args):
            result = original(*args)
            clock['after'] = True
            return result
        with patch.object(decoded._DeadlinePacketStore, 'verify_members', audit), \
                patch.object(decoded.time, 'monotonic', side_effect=lambda: now + (30 if clock['after'] else 0)):
            with self.assertRaises(TimeoutError):
                self.recover()
        self.assertFalse(self.target.exists())

    def test_cli_requires_full_explicit_identity(self):
        command = [sys.executable, decoded.__file__, '--case-root', str(self.case),
                   '--repository-root', str(self.repo), '--logical-original', self.logical,
                   '--copy-to', str(self.target), '--cap-seconds', '15']
        result = subprocess.run(command, capture_output=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.target.read_bytes(), self.raw)
        self.assertEqual(json.loads(result.stdout)['sha256'], sha(self.raw))


if __name__ == '__main__':
    unittest.main()
