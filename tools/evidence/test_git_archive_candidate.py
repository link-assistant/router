import copy
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import git_archive_candidate as candidate
from packet import PacketStore, PREFIX


def sha(data):
    return hashlib.sha256(data).hexdigest()


class GitArchiveCandidateTests(unittest.TestCase):
    """Only small synthetic repositories; never the project's case or index."""
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='router-git-candidate-')
        self.home = Path(self.temp.name).resolve()
        self.repo = self.home / 'source'
        self.repo.mkdir()
        self.case = self.repo / PREFIX
        self.case.mkdir(parents=True)
        self.git('init', '-q')
        self.git('config', 'user.name', 'Configured Fixture Author')
        self.git('config', 'user.email', 'configured-fixture@example.invalid')
        (self.repo / 'project.txt').write_bytes(b'complete unchanged project\x00\xff')
        old_archive = self.case / 'old.tar.xz'
        self.pack(old_archive, b'old complete evidence')
        self.commit('original full archive')
        archive_commit = self.head()
        self.old_index = {'schema': 'complete-packet-git-index-v1', 'archives': {
            'old.tar.xz': {'bytes': old_archive.stat().st_size,
                           'sha256': sha(old_archive.read_bytes()), 'git': {
                               'commit': archive_commit, 'path': PREFIX + 'old.tar.xz',
                               'blob': self.git('rev-parse', archive_commit + ':' + PREFIX + 'old.tar.xz').decode().strip()}}}}
        self.index = self.case / 'packet-git-index.json'
        self.index.write_text(json.dumps(self.old_index))
        self.commit('original packet index')
        self.base = self.head()
        self.source = self.home / 'complete-new.tar.xz'
        self.members = self.pack(self.source, b'new complete evidence\x00\xff' * 37)
        archive_bytes = self.source.read_bytes()
        self.receipt = {'schema': 'complete-evidence-packet-v1',
                        'archiveBytes': len(archive_bytes), 'archiveSha256': sha(archive_bytes),
                        'completeMembers': len(self.members),
                        'completeOriginalBytes': sum(row['bytes'] for row in self.members),
                        'members': self.members}
        self.receipt_path = self.home / 'capture.json'
        self.plan_path = self.home / 'plan.json'
        self.output = self.home / 'fresh-output'
        self.plan = {'schema': 'complete-git-archive-candidate-v1', 'base': self.base,
                     'ref': 'refs/evidence/issue-759/synthetic-candidate',
                     'index': 'packet-git-index.json', 'archives': [{
                         'name': 'new/complete.tar.xz', 'source': str(self.source),
                         'bytes': len(archive_bytes), 'sha256': sha(archive_bytes), 'receipt': {}}]}
        self.write_receipt()
        self.before = self.checkout_fact()

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args, cwd=None):
        return subprocess.check_output(
            ['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false',
             '-c', 'core.hooksPath=/dev/null', *args], cwd=cwd or self.repo,
            env={**{key: value for key, value in os.environ.items() if not key.startswith('GIT_')},
                 'GIT_OPTIONAL_LOCKS': '0'},
            stderr=subprocess.DEVNULL, timeout=10)

    def commit(self, message):
        self.git('add', '.')
        self.git('commit', '-qm', message)

    def head(self):
        return self.git('rev-parse', 'HEAD').decode().strip()

    def checkout_fact(self):
        return (self.head(), (self.repo / '.git/index').read_bytes(),
                self.git('status', '--porcelain'), (self.repo / 'project.txt').read_bytes())

    def pack(self, path, data):
        with tarfile.open(path, 'w:xz', preset=0) as tar:
            for name, body in [('full.bin', data), ('other.txt', b'also fully retained')]:
                item = tarfile.TarInfo(name)
                item.size = len(body)
                tar.addfile(item, io.BytesIO(body))
        return [{'path': name, 'bytes': len(body), 'sha256': sha(body)} for name, body in
                [('full.bin', data), ('other.txt', b'also fully retained')]]

    def write_receipt(self):
        raw = json.dumps(self.receipt).encode()
        self.receipt_path.write_bytes(raw)
        self.plan['archives'][0]['receipt'] = {
            'source': str(self.receipt_path), 'bytes': len(raw), 'sha256': sha(raw)}
        self.write_plan()

    def write_plan(self):
        self.plan_path.write_text(json.dumps(self.plan))

    def prepare(self, **options):
        return candidate.prepare_candidate(self.repo, self.plan_path, self.output,
                                           cap_seconds=options.pop('cap_seconds', 15), **options)

    def no_ref(self):
        result = subprocess.run(['git', 'show-ref', '--verify', '--quiet', self.plan['ref']],
                                cwd=self.repo, capture_output=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)

    def test_actual_ancestor_bytes_and_only_index_tree_change(self):
        original = self.source.read_bytes()
        result = self.prepare()
        self.assertEqual(self.checkout_fact(), self.before)
        self.assertEqual(self.source.read_bytes(), original)
        self.assertFalse((self.case / 'new').exists())
        archive, final = result['archiveCommit'], result['candidateCommit']
        self.assertEqual(self.git('rev-parse', archive + '^').decode().strip(), self.base)
        self.assertEqual(self.git('rev-parse', final + '^').decode().strip(), archive)
        self.assertEqual(self.git('show', archive + ':' + PREFIX + 'new/complete.tar.xz'), original)
        self.assertEqual(self.git('diff-tree', '--no-commit-id', '--name-only', '-r', self.base, final),
                         (PREFIX + 'packet-git-index.json\n').encode())
        self.assertEqual(self.git('rev-parse', self.plan['ref']).decode().strip(), final)
        new_index = json.loads(Path(result['candidateIndex']).read_bytes())
        self.assertEqual(new_index['archives']['old.tar.xz'], self.old_index['archives']['old.tar.xz'])
        self.assertTrue(result['sourceArchives'][0]['everySourceAndGitByteCompared'])
        self.assertFalse(result['adopted'])
        self.assertTrue(result['fullContinuityAndFitPending'])

    def test_unchanged_reader_refuses_unadopted_then_recovers_every_byte(self):
        result = self.prepare()
        # Only an external overlay, never write the candidate index to the source case.
        overlay = self.home / 'overlay'
        overlay.mkdir()
        (overlay / 'packet-git-index.json').write_bytes(Path(result['candidateIndex']).read_bytes())
        with self.assertRaises(ValueError):
            with PacketStore(overlay, self.repo).verified_archive('new/complete.tar.xz'):
                pass
        # This checkout is ONLY the disposable synthetic test repository.
        self.git('checkout', '-q', '--detach', result['candidateCommit'])
        store = PacketStore(self.case, self.repo)
        self.assertEqual(store.verify_members('new/complete.tar.xz', self.members)['completeMembers'], 2)
        with store.verified_archive('new/complete.tar.xz') as recovered:
            self.assertEqual(recovered.read(), self.source.read_bytes())
        self.assertFalse((self.case / 'new/complete.tar.xz').exists())

    def test_real_configured_identity_and_actual_dates(self):
        with patch.dict(os.environ, {'GIT_AUTHOR_NAME': 'Untrusted Override',
                                     'GIT_AUTHOR_EMAIL': 'ignored@example.invalid',
                                     'GIT_AUTHOR_DATE': '2001-01-01T00:00:00Z',
                                     'GIT_COMMITTER_DATE': '2001-01-01T00:00:00Z'}):
            result = self.prepare()
        for commit in (result['archiveCommit'], result['candidateCommit']):
            actual = self.git('show', '-s', '--format=%an|%ae|%cn|%ce|%at|%ct', commit).decode().strip().split('|')
            self.assertEqual(actual[:4], ['Configured Fixture Author', 'configured-fixture@example.invalid'] * 2)
            self.assertGreater(int(actual[4]), 1600000000)
            self.assertGreater(int(actual[5]), 1600000000)

    def test_existing_output_and_ref_never_overwrite(self):
        self.output.mkdir()
        marker = self.output / 'original'
        marker.write_bytes(b'keep')
        with self.assertRaises(FileExistsError):
            self.prepare()
        self.assertEqual(marker.read_bytes(), b'keep')
        self.output = self.home / 'different-output'
        self.git('update-ref', self.plan['ref'], self.base)
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.prepare()
        self.assertEqual(self.git('rev-parse', self.plan['ref']).decode().strip(), self.base)

    def test_scope_path_and_namespace_controls(self):
        original = copy.deepcopy(self.plan)
        for name in ('../escape.tar.xz', '.git/config', 'OLD.TAR.XZ', 'packet-git-index.json/child', 'old.tar.xz/child'):
            with self.subTest(name=name):
                self.plan = copy.deepcopy(original)
                self.plan['archives'][0]['name'] = name
                self.write_plan()
                self.output = self.home / ('attempt-' + sha(name.encode())[:10])
                with self.assertRaises(ValueError):
                    self.prepare()
                self.no_ref()
        self.assertEqual(self.checkout_fact(), self.before)

    def test_tracked_unindexed_name_cannot_be_replaced(self):
        (self.case / 'unindexed').write_bytes(b'original not in archive index')
        self.commit('tracked nonarchive original')
        self.plan['base'] = self.head()
        self.plan['archives'][0]['name'] = 'unindexed/child.tar.xz'
        self.write_plan()
        with self.assertRaisesRegex(ValueError, 'Tracked archive namespace'):
            self.prepare()
        self.assertEqual((self.case / 'unindexed').read_bytes(), b'original not in archive index')
        self.no_ref()

    def test_strict_json_sizes_and_cap_controls(self):
        raw = self.plan_path.read_text()
        for text in (raw.replace('"schema":', '"schema":"duplicate","schema":', 1),
                     raw.replace('"bytes": ' + str(self.plan['archives'][0]['bytes']), '"bytes": true', 1),
                     raw.replace('"archives":', '"unknown":NaN,"archives":', 1)):
            with self.subTest(text=text[:80]):
                self.plan_path.write_text(text)
                with self.assertRaises(ValueError):
                    self.prepare()
        self.plan_path.write_text(raw)
        for cap in (True, 0, 171, 1.5):
            with self.assertRaises(ValueError):
                self.prepare(cap_seconds=cap)
        self.no_ref()

    def test_dirty_checkout_and_foreign_base_refuse(self):
        (self.repo / 'project.txt').write_bytes(b'changed project')
        with self.assertRaisesRegex(ValueError, 'exact clean'):
            self.prepare()
        self.no_ref()
        self.assertEqual((self.repo / 'project.txt').read_bytes(), b'changed project')
        self.git('checkout', '--', 'project.txt')
        self.output = self.home / 'foreign-base-output'
        self.plan['base'] = self.old_index['archives']['old.tar.xz']['git']['commit']
        self.write_plan()
        with self.assertRaisesRegex(ValueError, 'exact clean'):
            self.prepare()
        self.no_ref()

    def test_source_symlink_and_output_ancestry_refuse(self):
        linked = self.home / 'linked.tar.xz'
        linked.symlink_to(self.source)
        self.plan['archives'][0]['source'] = str(linked)
        self.write_plan()
        with self.assertRaises(OSError):
            self.prepare()
        self.no_ref()
        self.output = self.repo / 'not-allowed'
        with self.assertRaisesRegex(ValueError, 'outside'):
            self.prepare()
        self.assertFalse(self.output.exists())

    def test_parent_traversal_cannot_hide_repository_output(self):
        self.output = self.home / 'unused' / '..' / 'source' / 'not-allowed'
        with self.assertRaisesRegex(ValueError, 'canonical'):
            self.prepare()
        self.assertFalse((self.repo / 'not-allowed').exists())

    def test_incomplete_receipt_and_boolean_totals_refuse(self):
        self.receipt['members'] = self.members[:1]
        self.write_receipt()
        with self.assertRaisesRegex(ValueError, 'Extra'):
            self.prepare()
        self.no_ref()
        self.output = self.home / 'second-output'
        self.receipt['members'] = self.members
        self.receipt['completeMembers'] = True
        self.write_receipt()
        with self.assertRaises(ValueError):
            self.prepare()
        self.no_ref()

    def test_full_blob_readback_rejects_wrong_git_bytes(self):
        old_blob = self.old_index['archives']['old.tar.xz']['git']['blob']
        original_run = subprocess.run
        def wrong_blob(argv, **options):
            if 'hash-object' in argv:
                return subprocess.CompletedProcess(argv, 0, (old_blob + '\n').encode(), b'')
            return original_run(argv, **options)
        with patch.object(candidate.subprocess, 'run', side_effect=wrong_blob):
            with self.assertRaisesRegex(ValueError, 'Full Git blob differs'):
                self.prepare()
        self.no_ref()
        self.assertEqual(self.checkout_fact(), self.before)

    def test_changed_receipt_is_rechecked_before_private_ref(self):
        original_verify = PacketStore.verify_members
        def replace_receipt(verifier, name, members):
            result = original_verify(verifier, name, members)
            self.receipt_path.write_bytes(self.receipt_path.read_bytes() + b' ')
            return result
        with patch.object(PacketStore, 'verify_members', replace_receipt):
            with self.assertRaisesRegex(ValueError, 'source/receipt changed'):
                self.prepare()
        self.no_ref()
        self.assertEqual(self.checkout_fact(), self.before)

    def test_changed_source_after_full_verify_is_refused(self):
        original_verify = PacketStore.verify_members
        def change_source(verifier, name, members):
            result = original_verify(verifier, name, members)
            self.source.write_bytes(self.source.read_bytes() + b'changed')
            return result
        with patch.object(PacketStore, 'verify_members', change_source):
            with self.assertRaises(ValueError):
                self.prepare()
        self.no_ref()

    def test_foreign_existing_witness_does_not_gain_ancestry(self):
        tree = self.git('rev-parse', 'HEAD^{tree}').decode().strip()
        foreign = self.git('commit-tree', tree, '-m', 'unrelated external history').decode().strip()
        self.old_index['archives']['old.tar.xz']['git']['commit'] = foreign
        self.index.write_text(json.dumps(self.old_index))
        self.commit('invalid external witness')
        self.plan['base'] = self.head()
        self.write_plan()
        with self.assertRaisesRegex(ValueError, 'Git command failed'):
            self.prepare()
        self.no_ref()

    def test_deadline_failure_retains_command_and_original(self):
        original = self.source.read_bytes()
        real_monotonic = candidate.time.monotonic
        def expires():
            return real_monotonic() + (200 if (self.output / 'commands/0.stdout.raw.log').exists() else 0)
        with patch.object(candidate.time, 'monotonic', side_effect=expires):
            with self.assertRaises(TimeoutError):
                self.prepare()
        self.assertEqual(self.source.read_bytes(), original)
        self.assertTrue((self.output / 'commands/0.command.json').is_file())
        self.assertTrue((self.output / 'commands/0.stdout.raw.log').is_file())
        self.no_ref()


if __name__ == '__main__':
    unittest.main()
