"""Whole reusable-driver controls. Every real child is sequential and bounded."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('complete_capture_batch', Path(__file__).with_name('capture-shards.py'))
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def pin(path):
    raw = path.read_bytes()
    return {'path': str(path), 'bytes': len(raw), 'sha256': sha(raw)}


def git(root, *args):
    return subprocess.check_output(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false',
                                    '-c', 'core.hooksPath=/dev/null', *args], cwd=root,
                                   stderr=subprocess.PIPE, timeout=10).decode().strip()


class CaptureBatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='router-complete-capture-batch-')
        self.root = Path(self.temp.name).resolve()
        self.next = 0

    def tearDown(self):
        self.temp.cleanup()

    def fresh(self, name='output'):
        self.next += 1
        return self.root / (name + '-' + str(self.next))

    def source(self, root=ROOT):
        return {'root': str(root), 'head': git(root, 'rev-parse', 'HEAD'),
                'code': {name: {key: pin(root / 'tools/evidence' / name)[key] for key in ('bytes', 'sha256')} for name in driver.CODE}}

    def row(self, name, data=b'whole original\n'):
        source = self.fresh('body')
        source.write_bytes(data)
        return {'path': name, 'originalPath': str(source), 'bytes': len(data), 'sha256': sha(data)}

    def job(self, name, rows=None, mode='shard'):
        manifest = self.fresh('manifest')
        manifest.write_text(json.dumps({'members': rows if rows is not None else [self.row(name + '.txt')]}))
        return {'id': name, 'mode': mode, 'manifest': pin(manifest)}

    def plan(self, jobs, source=None, **changes):
        value = {'schema': 'complete-evidence-capture-batch-v1', 'source': source or self.source(),
                 'jobs': jobs, 'capSeconds': 120, 'minimumFreeBytes': 512 * 1024 * 1024,
                 'pendingRoots': [str(self.root / 'not-frozen-yet')]}
        value.update(changes)
        path = self.fresh('plan')
        path.write_text(json.dumps(value))
        return pin(path)

    def run_plan(self, plan, output=None):
        output = output or self.fresh()
        result = driver.run_batch(plan, output)
        return result, output

    def test_actual_capture_then_resume_authenticates_without_recompression(self):
        rows = [self.row('first'), self.row('second')]
        plan = self.plan([self.job('one', rows)])
        first, output = self.run_plan(plan)
        self.assertTrue(first['status'].startswith('PASS'), first)
        self.assertFalse(first['completeLatestEvidence'])
        self.assertTrue(first['jobs'][0]['recompressed'])
        archive = output / 'job-one/complete.tar.xz'
        original = archive.read_bytes()
        identity = archive.stat()
        real = driver._monitor

        def no_compressor(argv, *args, **kwargs):
            self.assertFalse(any(str(arg).endswith('/capture-packet.py') for arg in argv))
            return real(argv, *args, **kwargs)

        with patch.object(driver, '_monitor', side_effect=no_compressor):
            second, unused = self.run_plan(plan, output)
        self.assertTrue(second['status'].startswith('PASS'), second)
        self.assertFalse(second['jobs'][0]['recompressed'])
        self.assertEqual(archive.read_bytes(), original)
        self.assertEqual((archive.stat().st_ino, archive.stat().st_mtime_ns, archive.stat().st_ctime_ns),
                         (identity.st_ino, identity.st_mtime_ns, identity.st_ctime_ns))
        for row in rows:
            self.assertEqual(Path(row['originalPath']).read_bytes(), b'whole original\n')

    def test_disk_stop_preserves_completed_archive_and_resumes_remaining_jobs(self):
        plan = self.plan([self.job('one'), self.job('two')])
        output = self.fresh()
        real_space = driver._space

        def fall_after_complete(path):
            return 0 if (output / 'job-one/complete.json').exists() else real_space(path)

        with patch.object(driver, '_space', side_effect=fall_after_complete):
            result, unused = self.run_plan(plan, output)
        self.assertEqual(result['status'], 'STOPPED')
        self.assertEqual(len(result['jobs']), 1)
        self.assertFalse((output / 'job-two').exists())
        archived = (output / 'job-one/complete.tar.xz').read_bytes()
        resumed, unused = self.run_plan(plan, output)
        self.assertTrue(resumed['status'].startswith('PASS'), resumed)
        self.assertEqual([row['recompressed'] for row in resumed['jobs']], [False, True])
        self.assertEqual((output / 'job-one/complete.tar.xz').read_bytes(), archived)

    def test_changed_original_refuses_resume_and_never_replaces_archive(self):
        row = self.row('original'); job = self.job('one', [row]); plan = self.plan([job])
        result, output = self.run_plan(plan)
        self.assertTrue(result['status'].startswith('PASS'), result)
        archived = (output / 'job-one/complete.tar.xz').read_bytes()
        Path(row['originalPath']).write_bytes(b'changed original\n')
        stopped, unused = self.run_plan(plan, output)
        self.assertEqual(stopped['status'], 'STOPPED')
        self.assertFalse(stopped['jobs'])
        self.assertEqual((output / 'job-one/complete.tar.xz').read_bytes(), archived)

    def test_tampered_completed_archive_fails_full_reauthentication(self):
        plan = self.plan([self.job('one')]); result, output = self.run_plan(plan)
        self.assertTrue(result['status'].startswith('PASS'), result)
        archive = output / 'job-one/complete.tar.xz'
        original = archive.read_bytes(); changed = bytearray(original); changed[len(changed) // 2] ^= 1
        archive.write_bytes(changed)
        stopped, unused = self.run_plan(plan, output)
        self.assertEqual(stopped['status'], 'STOPPED')
        self.assertEqual(archive.read_bytes(), changed)
        self.assertTrue((output / 'job-one/complete.json').exists())

    def test_missing_child_outputs_and_incomplete_attempts_cannot_be_success(self):
        plan = self.plan([self.job('one')]); output = self.fresh()
        with patch.object(driver, '_monitor', return_value={'exitCode': 0}):
            first, unused = self.run_plan(plan, output)
        self.assertEqual(first['status'], 'STOPPED')
        self.assertFalse((output / 'job-one/complete.json').exists())
        second, unused = self.run_plan(plan, output)
        self.assertEqual(second['status'], 'STOPPED')
        self.assertIn('never automatic retry', second['error']['message'])
        self.assertTrue((output / 'run-000001/terminal.json').exists())

    def test_whole_oversized_originals_stay_intact_and_never_enter_shard_lane(self):
        # Declared-only metadata exercises selection limits, not body authority.
        for length in (64 * 1024 * 1024 + 1, 128 * 1024 * 1024):
            row = {'path': 'whole', 'originalPath': str(self.root / 'not-read'), 'bytes': length, 'sha256': 'a' * 64}
            whole = self.job('one', [row], 'whole-original')
            rows, unused = driver._rows(whole, lambda: None)
            self.assertEqual(rows, [row])
            with self.assertRaisesRegex(ValueError, '64MiB'):
                driver._rows({**whole, 'mode': 'shard'}, lambda: None)
        row['bytes'] = 128 * 1024 * 1024 + 1
        with self.assertRaises(ValueError):
            driver._rows(self.job('large', [row], 'whole-original'), lambda: None)
        with self.assertRaisesRegex(ValueError, 'ONE intact'):
            driver._rows(self.job('pair', [self.row('a'), self.row('b')], 'whole-original'), lambda: None)

    def receipt(self, rows):
        return {'schema': 'complete-evidence-packet-v1', 'members': rows, 'completeMembers': len(rows),
                'completeOriginalBytes': sum(row['bytes'] for row in rows), 'allDecodedOriginalsVerified': True,
                'allSelectedOriginalsUnchanged': True, 'capSeconds': 170, 'compression': driver.COMPRESSION,
                'harnessSha256': 'b' * 64, 'sourceHead': 'c' * 40}

    def test_receipt_extras_require_exact_boolean_and_backward_regular_target(self):
        a = self.row('a', b'x'); b = self.row('b', b'x'); c = self.row('c', b'x')
        code = {'capture-packet.py': {'sha256': 'b' * 64}}
        positive = self.receipt([a, {**b, 'storedAsHardlink': 'a', 'fullByteEqualityBeforeHardlink': True}])
        self.assertEqual(driver._receipt(positive, [a, b], {}, code), 1)
        bad_rows = [
            [a, {**b, 'storedAsHardlink': 'a', 'fullByteEqualityBeforeHardlink': 1}],
            [a, {**b, 'storedAsHardlink': 'a', 'fullByteEqualityBeforeHardlink': 'true'}],
            [a, {**b, 'storedAsHardlink': 'future', 'fullByteEqualityBeforeHardlink': True}],
            [a, {**b, 'authority': True}],
            [a, {**b, 'bytes': True}],
            [a, {**b, 'storedAsHardlink': '../outside', 'fullByteEqualityBeforeHardlink': True}],
        ]
        for rows in bad_rows:
            with self.assertRaises(ValueError):
                driver._receipt(self.receipt(rows), [a, b], {}, code)
        chain = self.receipt([a, {**b, 'storedAsHardlink': 'a', 'fullByteEqualityBeforeHardlink': True},
                              {**c, 'storedAsHardlink': 'b', 'fullByteEqualityBeforeHardlink': True}])
        with self.assertRaisesRegex(ValueError, 'backward'):
            driver._receipt(chain, [a, b, c], {}, code)
        boolean_count = self.receipt([a]); boolean_count['completeMembers'] = True
        with self.assertRaises(ValueError): driver._receipt(boolean_count, [a], {}, code)

    def test_batch_bounds_duplicate_names_and_case_output_are_refused(self):
        job = self.job('one')
        for cap in (0, True, 3601, 1.5):
            with self.assertRaisesRegex(ValueError, 'batch cap'):
                self.run_plan(self.plan([job], capSeconds=cap))
        for free in (True, 512 * 1024 * 1024 - 1):
            with self.assertRaises(ValueError): self.run_plan(self.plan([job], minimumFreeBytes=free))
        for jobs in ([job, job], [job, {**job, 'id': 'other'}], [{**job, 'id': '../outside'}]):
            with self.assertRaises(ValueError): self.run_plan(self.plan(jobs))
        with self.assertRaisesRegex(ValueError, 'outside case'):
            self.run_plan(self.plan([job]), self.root / 'docs/case-studies/fixture/capture')

    def test_duplicate_json_symlink_and_changed_source_code_preflight_refuse(self):
        job = self.job('one'); raw = Path(job['manifest']['path']).read_text()
        bad = self.fresh('duplicate-json'); bad.write_text('{"members":[],"members":[]}')
        with self.assertRaises(ValueError): driver._rows({**job, 'manifest': pin(bad)}, lambda: None)
        linked = self.fresh('linked'); linked.symlink_to(job['manifest']['path'])
        with self.assertRaises((ValueError, OSError)):
            driver._rows({**job, 'manifest': {**job['manifest'], 'path': str(linked)}}, lambda: None)
        source = self.source(); source['code']['capture-packet.py']['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'Source code'):
            self.run_plan(self.plan([job], source))
        source = self.source(); source['head'] = '0' * 40
        with self.assertRaisesRegex(ValueError, 'HEAD'):
            self.run_plan(self.plan([job], source))
        self.assertEqual(Path(job['manifest']['path']).read_text(), raw)

    def test_monitor_deadline_and_disk_pressure_kill_and_reap_owned_child(self):
        for mode in ('deadline', 'disk'):
            directory = self.fresh('monitor'); directory.mkdir()
            context = patch.object(driver, '_space', return_value=0) if mode == 'disk' else patch.object(driver, '_space', return_value=10 ** 12)
            with context, self.assertRaises(RuntimeError):
                driver._monitor([sys.executable, '-c', 'import time; time.sleep(20)'], directory,
                                str(ROOT), time.monotonic() + (3 if mode == 'disk' else 1.5), self.root, 512 * 1024 * 1024)
            result = json.loads((directory / 'terminal.json').read_text())
            self.assertTrue(result['childReaped'])
            self.assertLess(result['exitCode'], 0)
            self.assertLess(result['elapsedSeconds'], 5)

    def test_final_ledger_boundary_rechecks_original_metadata_and_archive(self):
        actual_fresh = driver._fresh
        for variant in ('manifest', 'archive'):
            job = self.job('one'); plan = self.plan([job]); output = self.fresh()
            def change_at_final(path, value, check):
                written = actual_fresh(path, value, check)
                if path.name == 'terminal.json' and path.parent.name.startswith('run-'):
                    selected = Path(job['manifest']['path']) if variant == 'manifest' else output / 'job-one/complete.tar.xz'
                    saved = selected.with_name(selected.name + '.preserved')
                    selected.rename(saved)
                    selected.write_bytes(saved.read_bytes())
                return written
            with patch.object(driver, '_fresh', side_effect=change_at_final):
                stopped, unused = self.run_plan(plan, output)
            self.assertEqual(stopped['status'], 'STOPPED')
            self.assertTrue((output / 'run-000001/finalization-refusal.json').exists())
            self.assertIn('Final ledger boundary', stopped['error']['message'])

    def fixture_git(self):
        repository = self.fresh('synthetic-git'); repository.mkdir()
        git(repository, 'init', '-q')
        # Same explicitly synthetic identity as existing packet_test.py,
        # never used by production capture or actual archive-adoption commits.
        git(repository, 'config', 'user.name', 'Fixture'); git(repository, 'config', 'user.email', 'fixture@example.invalid')
        git(repository, 'config', 'commit.gpgSign', 'false')
        (repository / 'base.txt').write_text('actual synthetic source base\n')
        git(repository, 'add', '--all'); git(repository, 'commit', '-qm', 'Synthetic source base')
        (repository / 'tools/evidence').mkdir(parents=True)
        for name in driver.CODE:
            shutil.copyfile(ROOT / 'tools/evidence' / name, repository / 'tools/evidence' / name)
        git(repository, 'add', '--all'); git(repository, 'commit', '-qm', 'Synthetic complete packet producer source')
        return repository

    def test_existing_ordinary_git_packet_reuses_absent_archive_without_copying_case(self):
        repository = self.fixture_git(); row = self.row('body'); job = self.job('old', [row])
        source_head = git(repository, 'rev-parse', 'HEAD')
        archive = self.fresh('archive'); receipt = self.fresh('receipt')
        result = subprocess.run([sys.executable, '-B', str(repository / 'tools/evidence/capture-packet.py'),
                                 '--source-root', str(repository), '--head', source_head, '--manifest', job['manifest']['path'],
                                 '--archive', str(archive), '--receipt', str(receipt), '--cap-seconds', '170'],
                                capture_output=True, text=True, timeout=45)
        self.assertEqual(result.returncode, 0, result.stderr)
        # Genuine cherry-pick onto a different parent: same producer bytes,
        # while the actual source capture commit is NOT a receiving ancestor.
        git(repository, 'checkout', '-qb', 'receiving', source_head + '^')
        (repository / 'receiving.txt').write_text('receiving-only source parent\n')
        git(repository, 'add', '--all'); git(repository, 'commit', '-qm', 'Receiving source parent')
        git(repository, 'cherry-pick', source_head)
        relation = subprocess.run(['git', 'merge-base', '--is-ancestor', source_head, 'HEAD'], cwd=repository, capture_output=True)
        self.assertEqual(relation.returncode, 1)
        case = repository / 'docs/case-studies/issue-759'; (case / 'archives').mkdir(parents=True)
        stored = case / 'archives/complete.tar.xz'; shutil.copyfile(archive, stored)
        git(repository, 'add', '--all'); git(repository, 'commit', '-qm', 'Synthetic complete archive bytes')
        commit = git(repository, 'rev-parse', 'HEAD'); blob = git(repository, 'rev-parse', 'HEAD:docs/case-studies/issue-759/archives/complete.tar.xz')
        data = archive.read_bytes()
        index = {'schema': 'complete-packet-git-index-v1', 'archives': {'archives/complete.tar.xz':
                 {'bytes': len(data), 'sha256': sha(data), 'git': {'commit': commit, 'path': 'docs/case-studies/issue-759/archives/complete.tar.xz', 'blob': blob}}}}
        (case / 'packet-git-index.json').write_text(json.dumps(index)); git(repository, 'rm', '-q', str(stored.relative_to(repository)))
        git(repository, 'add', '--all'); git(repository, 'commit', '-qm', 'Synthetic absent physical packet witness')
        job['reuse'] = {'archive': {'bytes': len(data), 'sha256': sha(data), 'source': {'kind': 'packet', 'caseRoot': str(case), 'index': 'packet-git-index.json', 'name': 'archives/complete.tar.xz'}},
                        'receipt': pin(receipt), 'provenance': []}
        plan = self.plan([job], self.source(repository))
        completed, output = self.run_plan(plan)
        self.assertTrue(completed['status'].startswith('PASS'), completed)
        self.assertFalse(completed['jobs'][0]['recompressed'])
        self.assertFalse(stored.exists())
        self.assertFalse(list(output.rglob('*.tar.xz')))
        self.assertEqual(archive.read_bytes(), data)
        verified = json.loads(Path(completed['jobs'][0]['verification']['path']).read_text())
        self.assertFalse(verified['sourceProducerQualification']['ancestryAsserted'])
        self.assertEqual(verified['sourceProducerQualification']['originalSourceHead'], source_head)
        actual_fresh = driver._fresh
        def link_at_final_ledger(path, value, check):
            written = actual_fresh(path, value, check)
            if path.name == 'terminal.json' and path.parent.name.startswith('run-'):
                stored.symlink_to(self.root / 'missing-target')
            return written
        with patch.object(driver, '_fresh', side_effect=link_at_final_ledger):
            linked, unused = self.run_plan(plan)
        self.assertEqual(linked['status'], 'STOPPED')
        self.assertIn('Final ledger boundary', linked['error']['message'])
        self.assertTrue(stored.is_symlink())
        stored.unlink()  # Only this tiny synthetic fixture's newly created link.
        producer = repository / 'tools/evidence/capture-packet.py'
        producer.write_text(producer.read_text() + '\n# changed full producer bytes\n')
        git(repository, 'add', '--all'); git(repository, 'commit', '-qm', 'Changed producer source refusal control')
        changed = self.plan([job], self.source(repository))
        refused, unused = self.run_plan(changed)
        self.assertEqual(refused['status'], 'STOPPED')
        self.assertFalse(refused['jobs'])
        self.assertFalse(stored.exists())

    def test_expired_batch_stops_without_starting_or_creating_next_capture(self):
        job = self.job('one'); plan = self.plan([job], capSeconds=1)
        clock = [0]
        actual_read = driver._read
        def expire_after_metadata(pin, check):
            value = actual_read(pin, check)
            clock[0] = 2
            return value
        with patch.object(driver.time, 'monotonic', side_effect=lambda: clock[0]), patch.object(driver, '_read', side_effect=expire_after_metadata):
            with self.assertRaises(TimeoutError): self.run_plan(plan)


if __name__ == '__main__':
    unittest.main()
