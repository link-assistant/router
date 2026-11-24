import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tarfile
import tempfile
import time
import unittest
from unittest.mock import patch


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


planner = load('complete_shard_planner', 'shard-packets.py')
capture = load('complete_capture', 'capture-packet.py')


class ShardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='router-evidence-shards-')
        self.root = Path(self.temp.name).resolve()
        self.counter = 0

    def tearDown(self):
        self.temp.cleanup()

    def target(self):
        self.counter += 1
        return self.root / ('fresh-' + str(self.counter))

    def manifest(self, name, rows):
        path = self.root / name
        path.write_text(json.dumps({'members': rows}))
        return path

    def row(self, name, length=4):
        # The missing original is deliberate: planning must not read its body
        # or claim that a declared digest authenticates a source.
        return {'path': name, 'originalPath': str(self.root / ('unread-' + name.replace('/', '-'))), 'bytes': length, 'sha256': 'a' * 64}

    def test_complete_deterministic_rows_provenance_and_pending_scope(self):
        first = self.manifest('a.json', [self.row('z'), self.row('a')])
        second = self.manifest('b.json', [self.row('b'), self.row('zero', 0)])
        left, right = self.target(), self.target()
        a = planner.plan_shards([second, first], left, shard_bytes=8, pending_roots=[str(self.root / 'active')])
        b = planner.plan_shards([first, second], right, shard_bytes=8, pending_roots=[str(self.root / 'active')])
        self.assertEqual(a, b)
        self.assertEqual((left / 'shard-plan.json').read_bytes(), (right / 'shard-plan.json').read_bytes())
        self.assertEqual(a['completeRows'], 4)
        self.assertEqual(a['completeLogicalBytes'], 12)
        self.assertEqual([part['members'] for part in a['shards']], [2, 2])
        actual = [row for part in a['shards'] for row in json.loads((left / part['manifest']['path']).read_bytes())['members']]
        self.assertEqual(actual, sorted([self.row('z'), self.row('a'), self.row('b'), self.row('zero', 0)], key=lambda row: row['path']))
        self.assertEqual(len(a['membership']), 4)
        self.assertFalse(a['originalBodiesRead'])
        self.assertFalse(a['gitWitnessesIssued'])
        self.assertFalse(a['completeLatestEvidence'])
        self.assertEqual(a['pendingRoots'], [str(self.root / 'active')])

    def test_strict64mib_no_single_original_splitting_or_hash_budget(self):
        source = self.manifest('manifest.json', [self.row('a', planner.SHARD_BYTES), self.row('duplicate', planner.SHARD_BYTES)])
        result = planner.plan_shards([source], self.target())
        self.assertEqual([row['completeLogicalBytes'] for row in result['shards']], [planner.SHARD_BYTES] * 2)
        # Same hashes cannot reduce the logical budget or remove a name.
        self.assertEqual(result['completeRows'], 2)
        for length in (planner.SHARD_BYTES + 1, 128 * 1024 * 1024):
            source = self.manifest('large.json', [self.row('kept-intact', length)])
            target = self.target()
            with self.assertRaisesRegex(ValueError, 'retain it intact'):
                planner.plan_shards([source], target)
            self.assertFalse(target.exists())
            self.assertEqual(json.loads(source.read_bytes())['members'][0]['bytes'], length)

    def test_member_limit_and_archive_slot_page_boundary(self):
        source = self.manifest('many.json', [self.row('item-' + str(i).zfill(5), 0) for i in range(8192)])
        second = self.manifest('tail.json', [self.row('zz-final', 0)])
        result = planner.plan_shards([source, second], self.target())
        self.assertEqual([part['members'] for part in result['shards']], [8192, 1])
        source = self.manifest('pages.json', [self.row('unit-' + str(i).zfill(3), 1) for i in range(65)])
        result = planner.plan_shards([source], self.target(), shard_bytes=1)
        self.assertEqual([part['provisionalIndexPageSlot'] for part in result['shards']], [1] * 64 + [2])
        self.assertFalse(result['provisionalPagesIncludeExistingArchives'])
        self.assertTrue(result['actualPagesRequireAllOrdinaryWitnessInputs'])

    def test_original_row_and_schema_refusals_preserve_inputs(self):
        base = self.row('a')
        cases = [{**base, 'bytes': True}, {**base, 'bytes': -1}, {**base, 'bytes': 1.5}, {**base, 'sha256': 'bad'}, {**base, 'path': '../outside'}, {**base, 'path': 'a//b'}, {**base, 'path': 'line\nname'}, {**base, 'originalPath': 'relative'}, {**base, 'originalPath': str(self.root) + '/a/../b'}, {**base, 'authority': True}]
        for row in cases:
            source = self.manifest('bad.json', [row])
            before = source.read_bytes()
            with self.assertRaises(ValueError):
                planner.plan_shards([source], self.target())
            self.assertEqual(source.read_bytes(), before)
        source = self.manifest('duplicate.json', [base, base])
        with self.assertRaisesRegex(ValueError, 'Duplicate logical'):
            planner.plan_shards([source], self.target())
        for bad in ([], {'rows': [base]}, {'members': [], 'extra': 1}):
            source.write_text(json.dumps(bad))
            with self.assertRaises(ValueError):
                planner.plan_shards([source], self.target())

    def test_duplicate_json_nonfinite_and_source_aliases_refuse(self):
        source = self.manifest('input.json', [self.row('a')])
        original = source.read_text()
        for raw in ('{"members":[],"members":[]}', original.replace('"bytes": 4', '"bytes": NaN'), original.replace('"bytes": 4', '"bytes": Infinity')):
            source.write_text(raw)
            with self.assertRaises(ValueError):
                planner.plan_shards([source], self.target())
        source.write_text(original)
        linked = self.root / 'linked.json'
        linked.symlink_to(source)
        with self.assertRaises((OSError, ValueError)):
            planner.plan_shards([linked], self.target())
        fifo = self.root / 'fifo.json'
        os.mkfifo(fifo)
        with self.assertRaises(ValueError):
            planner.plan_shards([fifo], self.target())

    def test_deadline_limits_and_exclusive_output(self):
        source = self.manifest('input.json', [self.row('a')])
        for limit in (0, True, 171, 1.5):
            with self.assertRaises(ValueError):
                planner.plan_shards([source], self.target(), cap_seconds=limit)
        for limit in (0, True, planner.SHARD_BYTES + 1):
            with self.assertRaises(ValueError):
                planner.plan_shards([source], self.target(), shard_bytes=limit)
        target = self.target()
        with patch.object(planner.time, 'monotonic', side_effect=[0, 31]):
            with self.assertRaises(TimeoutError):
                planner.plan_shards([source], target)
        self.assertFalse(target.exists())
        target = self.target()
        target.mkdir()
        (target / 'old').write_bytes(b'full preserved original')
        with self.assertRaisesRegex(ValueError, 'Fresh'):
            planner.plan_shards([source], target)
        self.assertEqual((target / 'old').read_bytes(), b'full preserved original')
        linked = self.root / 'linked-directory'
        linked.symlink_to(target, target_is_directory=True)
        with self.assertRaises(OSError):
            planner.plan_shards([source], linked / 'fresh')

    def test_replaced_input_keeps_failed_outputs_and_has_no_success_plan(self):
        source = self.manifest('input.json', [self.row('a')])
        original, target = source.read_bytes(), self.target()
        actual = planner._fresh

        def replace(path, raw, maximum, check):
            result = actual(path, raw, maximum, check)
            if path.name.startswith('capture-manifest'):
                source.rename(self.root / 'preserved-original-input')
                source.write_bytes(original)
            return result

        with patch.object(planner, '_fresh', replace):
            with self.assertRaisesRegex(ValueError, 'input changed'):
                planner.plan_shards([source], target)
        self.assertTrue((target / 'capture-manifest-000001.json').is_file())
        self.assertFalse((target / 'shard-plan.json').exists())
        self.assertEqual((self.root / 'preserved-original-input').read_bytes(), original)

    def test_replaced_output_directory_and_changed_manifest_refuse_success(self):
        source = self.manifest('input.json', [self.row('a')])
        actual = planner._fresh
        for variant in ('directory', 'member'):
            target = self.target()
            preserved = target.with_name(target.name + '-preserved')

            def replace(path, raw, maximum, check):
                result = actual(path, raw, maximum, check)
                if path.name.startswith('capture-manifest'):
                    if variant == 'directory':
                        target.rename(preserved)
                        target.mkdir()
                    else:
                        path.write_bytes(b'{"members":[]}\n')
                return result

            with patch.object(planner, '_fresh', replace):
                with self.assertRaisesRegex(ValueError, 'output.*changed'):
                    planner.plan_shards([source], target)
            self.assertFalse((target / 'shard-plan.json').exists())
            if variant == 'directory':
                self.assertTrue((preserved / 'capture-manifest-000001.json').exists())

    def test_shard_final_ledger_write_cannot_hide_changed_input_component_or_ledger(self):
        actual = planner._fresh
        for variant in ('input', 'component', 'ledger'):
            source = self.manifest('final-shard-' + variant + '.json', [self.row('a')])
            original, target = source.read_bytes(), self.target()
            preserved = source.with_name(source.name + '.preserved')

            def mutate(path, raw, maximum, check):
                result = actual(path, raw, maximum, check)
                if path.name == 'shard-plan.json':
                    if variant == 'input':
                        source.rename(preserved)
                        source.write_bytes(original)
                    elif variant == 'component':
                        component = target / 'capture-manifest-000001.json'
                        value = json.loads(component.read_bytes())
                        value['members'][0]['sha256'] = 'd' * 64
                        component.write_bytes(planner._encoded(value))
                    else:
                        value = json.loads(path.read_bytes())
                        value['completeRows'] = False
                        path.write_bytes(planner._encoded(value))
                return result

            with patch.object(planner, '_fresh', mutate):
                with self.assertRaisesRegex(ValueError, 'changed'):
                    planner.plan_shards([source], target)
            # Failed ledgers/components stay inspectable; their presence is
            # never enough for the API or CLI to report successful planning.
            self.assertTrue((target / 'shard-plan.json').exists())
            self.assertEqual(source.read_bytes(), original)
            if variant == 'input':
                self.assertEqual(preserved.read_bytes(), original)

    def index(self, name, entries):
        path = self.root / name
        path.write_text(json.dumps({'schema': 'complete-packet-git-index-v1', 'archives': entries}))
        return path

    def witness(self, name):
        return {'bytes': 1, 'sha256': 'a' * 64, 'git': {'commit': 'b' * 40, 'path': 'docs/case-studies/issue-759/' + name, 'blob': 'c' * 40}}

    def test_ordinary_index_pages_preserve_full_direct_rows_and_all_provenance(self):
        names = ['archives/' + str(i).zfill(3) + '.xz' for i in range(65)]
        first = self.index('one.json', {name: self.witness(name) for name in names[:64]})
        second = self.index('two.json', {name: self.witness(name) for name in names[63:]})
        target = self.target()
        result = planner.plan_index_pages([second, first], target)
        self.assertEqual([page['archives'] for page in result['pages']], [64, 1])
        actual = {}
        for page in result['pages']:
            value = json.loads((target / page['index']['path']).read_bytes())
            self.assertEqual(value['schema'], 'complete-packet-git-index-v1')
            actual.update(value['archives'])
        self.assertEqual(actual, {name: self.witness(name) for name in names})
        self.assertEqual(len(next(row for row in result['membership'] if row['archive'] == names[63])['sources']), 2)
        self.assertFalse(result['gitWitnessesAuthenticated'])

    def test_index_page_refusals_cannot_issue_or_change_git_authority(self):
        name = 'original.xz'
        good = self.witness(name)
        for row in ({**good, 'bytes': True}, {**good, 'range': 0}, {**good, 'git': {**good['git'], 'path': '../foreign'}}, {**good, 'git': {**good['git'], 'commit': 'wrong'}}, {**good, 'archive': 'nested-alias'}):
            source = self.index('bad-index.json', {name: row})
            with self.assertRaises(ValueError):
                planner.plan_index_pages([source], self.target())
        first = self.index('first-index.json', {name: good})
        second = self.index('second-index.json', {name: {**good, 'sha256': 'd' * 64}})
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            planner.plan_index_pages([first, second], self.target())
        too_many = self.index('too-many.json', {str(i): self.witness(str(i)) for i in range(65)})
        with self.assertRaisesRegex(ValueError, 'ordinary packet index'):
            planner.plan_index_pages([too_many], self.target())

    def test_index_final_ledger_write_cannot_hide_changed_input_page_or_ledger(self):
        actual = planner._fresh
        for variant in ('input', 'component', 'ledger'):
            source = self.index('final-index-' + variant + '.json', {'a.xz': self.witness('a.xz')})
            original, target = source.read_bytes(), self.target()
            preserved = source.with_name(source.name + '.preserved')

            def mutate(path, raw, maximum, check):
                result = actual(path, raw, maximum, check)
                if path.name == 'index-page-plan.json':
                    if variant == 'input':
                        source.rename(preserved)
                        source.write_bytes(original)
                    elif variant == 'component':
                        component = target / 'packet-git-index-000001.json'
                        value = json.loads(component.read_bytes())
                        value['archives']['a.xz']['sha256'] = 'd' * 64
                        component.write_bytes(planner._encoded(value))
                    else:
                        value = json.loads(path.read_bytes())
                        value['directArchiveWitnesses'] = False
                        path.write_bytes(planner._encoded(value))
                return result

            with patch.object(planner, '_fresh', mutate):
                with self.assertRaisesRegex(ValueError, 'changed'):
                    planner.plan_index_pages([source], target)
            self.assertTrue((target / 'index-page-plan.json').exists())
            self.assertEqual(source.read_bytes(), original)
            if variant == 'input':
                self.assertEqual(preserved.read_bytes(), original)

    def test_actual_unchanged_reader_authenticates_pages_in_both_physical_states(self):
        from packet_test import PacketTests
        from packet import PacketStore
        fixture = PacketTests('test_full_physical_and_absent_git_recovery')
        fixture.setUp()
        try:
            result = planner.plan_index_pages([fixture.case / 'packet-git-index.json'], self.target())
            page = json.loads((Path(self.root / ('fresh-' + str(self.counter))) / result['pages'][0]['index']['path']).read_bytes())
            selected = fixture.case / 'selected-page.json'
            selected.write_text(json.dumps(page))
            for present in (True, False):
                if not present:
                    fixture.file.unlink()
                store = PacketStore(fixture.case, fixture.repo, index='selected-page.json')
                self.assertEqual(store.verify_members(fixture.name, fixture.members)['completeMembers'], 1)
            page['archives'][fixture.name]['git']['commit'] = 'f' * 40
            selected.write_text(json.dumps(page))
            with self.assertRaises(ValueError):
                PacketStore(fixture.case, fixture.repo, index='selected-page.json').verify_members(fixture.name, fixture.members)
        finally:
            fixture.tearDown()


class CompleteDuplicateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='router-complete-byte-alias-')
        self.root = Path(self.temp.name).resolve()
        self.data = b'whole\x00\xff\r\n' + bytes(range(256)) * 4097
        self.paths = [self.root / name for name in ('a', 'b')]
        for path in self.paths:
            path.write_bytes(self.data)
        self.expected = len(self.data), hashlib.sha256(self.data).hexdigest()

    def tearDown(self):
        self.temp.cleanup()

    def test_complete_equal_bytes_alias_actual_tar_with_full_empty_original(self):
        rows = [{'path': path.name, 'originalPath': str(path), 'bytes': self.expected[0], 'sha256': self.expected[1]} for path in self.paths]
        output = self.root / 'fresh.tar.xz'
        capture.write_archive(output, rows, time.monotonic() + 30)
        with tarfile.open(output) as archive:
            members = archive.getmembers()
            self.assertFalse(members[0].islnk())
            self.assertTrue(members[1].islnk())
            for member in members:
                self.assertEqual(archive.extractfile(member).read(), self.data)
        self.assertTrue(rows[1]['fullByteEqualityBeforeHardlink'])
        for path in self.paths:
            path.write_bytes(b'')
        capture.compare_duplicate_originals(*self.paths, (0, hashlib.sha256(b'').hexdigest()), time.monotonic() + 10)

    def test_a_matching_declared_or_reported_digest_never_replaces_full_byte_comparison(self):
        self.paths[1].write_bytes(self.data[:-1] + bytes([self.data[-1] ^ 1]))
        rows = [{'path': path.name, 'originalPath': str(path), 'bytes': self.expected[0], 'sha256': self.expected[1]} for path in self.paths]
        output = self.root / 'preserved-failed.tar.xz'
        # The old alias branch trusted file_digest on both originals. Falsify
        # that predicate while keeping the actual second bytes different.
        with patch.object(capture, 'file_digest', return_value=self.expected):
            with self.assertRaisesRegex(ValueError, 'every byte'):
                capture.write_archive(output, rows, time.monotonic() + 30)
        self.assertTrue(output.exists())
        self.assertNotIn('storedAsHardlink', rows[1])
        self.assertEqual(self.paths[0].read_bytes(), self.data)

    def test_short_regular_reads_still_compare_every_byte(self):
        actual = os.read
        calls = 0

        def short(descriptor, count):
            nonlocal calls
            calls += 1
            return actual(descriptor, min(count, 997 if calls % 2 else 311))

        with patch.object(os, 'read', short):
            capture.compare_duplicate_originals(*self.paths, self.expected, time.monotonic() + 10)
        self.assertGreater(calls, 10)

    def test_equal_prefix_truncation_wrong_full_hash_and_deadline_refuse(self):
        for body in (self.data[:-1], self.data + b'\x00'):
            self.paths[1].write_bytes(body)
            with self.assertRaisesRegex(ValueError, 'length'):
                capture.compare_duplicate_originals(*self.paths, self.expected, time.monotonic() + 10)
        self.paths[1].write_bytes(self.data)
        with self.assertRaisesRegex(ValueError, 'hash'):
            capture.compare_duplicate_originals(*self.paths, (len(self.data), 'f' * 64), time.monotonic() + 10)
        with self.assertRaises(TimeoutError):
            capture.compare_duplicate_originals(*self.paths, self.expected, time.monotonic() - 1)
        with self.assertRaisesRegex(ValueError, 'witness'):
            capture.compare_duplicate_originals(*self.paths, (True, self.expected[1]), time.monotonic() + 10)

    def test_linked_input_and_same_bytes_path_replacement_refuse(self):
        self.paths[1].unlink()
        self.paths[1].symlink_to(self.paths[0])
        with self.assertRaises(OSError):
            capture.compare_duplicate_originals(*self.paths, self.expected, time.monotonic() + 10)
        self.paths[1].unlink()
        self.paths[1].write_bytes(self.data)
        actual, replaced = os.read, False

        def replace(descriptor, count):
            nonlocal replaced
            chunk = actual(descriptor, count)
            if chunk and not replaced:
                replaced = True
                self.paths[0].rename(self.root / 'preserved-original')
                self.paths[0].write_bytes(self.data)
            return chunk

        with patch.object(os, 'read', replace):
            with self.assertRaisesRegex(ValueError, 'fd/path changed'):
                capture.compare_duplicate_originals(*self.paths, self.expected, time.monotonic() + 10)
        self.assertEqual((self.root / 'preserved-original').read_bytes(), self.data)


if __name__ == '__main__':
    unittest.main()
