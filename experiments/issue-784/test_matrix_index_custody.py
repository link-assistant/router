"""Small receiving controls for complete bytes, metadata and explicit refusals."""
import copy
import gzip
import hashlib
import io
import json
import unittest
import zipfile
from matrix_index_custody import read_complete_indices


def encoded(value):
    return (json.dumps(value, separators=(',', ':')) + '\n').encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


class Receiving(unittest.TestCase):
    def fixture(self, owned=False, alter=None):
        matrix_sha = 'a' * 64
        profile = {'name': 'neutral', 'sha256': 'b' * 64, 'directory': 'profiles/neutral', 'compilationProfile': {}}
        roots = [profile['directory'] + '/' + str(n) for n in range(9 if owned else 6)]
        output = {'path': roots[-1] + '/output.mjs', 'bytes': 3, 'sha256': 'c' * 64}
        plans = [{'outputs': [output], 'outputRoots': roots, 'expectedBytes': 3, 'manifest': {
            'implementationHashes': {'compiler.mjs': 'd' * 64}, 'totals': {}, 'functionCoverage': {}, 'projects': []}}]
        inputs = {'matrix': {'profiles': [profile], 'requiredProfiles': ['neutral']},
                  'corpus': {'sourceSetSha256': 'e' * 64, 'sources': [], 'cargo': []}}
        legacy = [] if owned else [output]
        ordinary = {'schema': 'independent-profile-bulk-inventory-v1', 'matrixSha256': matrix_sha,
            'requiredProfiles': ['neutral'], 'sourceSetSha256': 'e' * 64, 'sources': [], 'cargo': [],
            'translatorImplementationSha256': sha(encoded({'compiler.mjs': 'd' * 64})),
            'entries': [], 'expectedBytes': 0 if owned else 3, 'limits': {'entries': 16, 'expectedBytes': 1073741824},
            'profiles': [{'name': 'neutral', 'profileSha256': 'b' * 64, 'compilationProfile': {},
                'directory': 'profiles/neutral', 'inventory': 'profiles/neutral/parity/rust-source-inventory.json',
                'outputPlanSha256': sha(encoded(legacy)), 'outputFiles': len(legacy), 'expectedBytes': 0 if owned else 3,
                'totals': {}, 'functionCoverage': {}, 'projects': [], 'runtimeParity': False}],
            'canonicalNeutralOutputsChanged': False, 'platformDomainComplete': False, 'commonExecutableOutput': False,
            'runtimeParity': False, 'obligations': [
                {'kind': 'profile-domain-incomplete', 'message': 'Explicit profiles do not cover all Rust targets, Cargo features, build modes or residual platform families.'},
                {'kind': 'native-parity-unproved', 'message': 'Independent draft outputs preserve all refusals and do not establish complete native behavior.'},
                {'kind': 'common-executable-unproved', 'message': 'No merged output or profile-independent executable is emitted.'}]}
        values = [ordinary]
        paths = [f'profiles/matrix-{matrix_sha}.json']
        if owned:
            paths.append(f'profiles/owned-definitions-matrix-{matrix_sha}.json')
            values.append({'schema': 'materialized-owned-definitions-matrix-v1', 'matrixSha256': matrix_sha,
                'sourceSetSha256': 'e' * 64, 'profiles': [{'name': 'neutral', 'profileSha256': 'b' * 64,
                    'directory': 'profiles/neutral', 'index': 'profiles/neutral/tools/translation/generated/owned-definitions/index.json',
                    'outputs': [output], 'expectedBytes': 3}], 'runtimeParity': False, 'moduleStartupEquivalent': False})
        if alter:
            alter(values)
        capsule = {'schema': 'unqualified-isolated-matrix-draft-v2', 'indices': [], 'completeBytes': 3, 'completeIndexBytes': 0}
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            for at, (path, value) in enumerate(zip(paths, values), 1):
                raw = encoded(value)
                stored = gzip.compress(raw)
                name = f'index-{at:02d}.json.gz'
                archive.writestr('complete-fixture/' + name, stored)
                capsule['indices'].append({'path': path, 'bytes': len(raw), 'sha256': sha(raw),
                    'storedAs': name, 'storedBytes': len(stored), 'storedSha256': sha(stored)})
                capsule['completeIndexBytes'] += len(raw)
        return buffer.getvalue(), capsule, plans, inputs, matrix_sha, owned

    def read(self, value, capsule=None):
        data, original, plans, inputs, matrix_sha, owned = value
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            return read_complete_indices(archive, {row.filename: row for row in archive.infolist()},
                'complete-fixture/', original if capsule is None else capsule, plans, inputs, matrix_sha, [], owned)

    def test_complete_ordinary_and_owned_present_indices(self):
        for owned in [False, True]:
            value = self.fixture(owned)
            result = self.read(value)
            self.assertEqual(len(result['indices']), 2 if owned else 1)
            self.assertEqual(result['completeBytes'], value[1]['completeIndexBytes'])

    def test_legacy_is_explicitly_missing_index_evidence(self):
        value = self.fixture()
        capsule = {'schema': 'unqualified-isolated-matrix-draft-v1'}
        self.assertEqual(self.read(value, capsule), {'indices': [], 'members': [], 'completeBytes': 0})
        with self.assertRaises(RuntimeError):
            self.read(value, {**capsule, 'indices': []})

    def test_missing_actual_index_is_never_reconstructed(self):
        value = self.fixture(True)
        capsule = copy.deepcopy(value[1]); capsule['indices'].pop()
        with self.assertRaisesRegex(RuntimeError, 'Every actual computed'):
            self.read(value, capsule)

    def test_stored_and_decoded_hashes_and_lengths_are_independent(self):
        value = self.fixture()
        for key, replacement in [('sha256', 'f' * 64), ('storedSha256', 'f' * 64), ('bytes', 1), ('storedBytes', 1)]:
            capsule = copy.deepcopy(value[1]); capsule['indices'][0][key] = replacement
            with self.assertRaises(RuntimeError):
                self.read(value, capsule)

    def test_path_order_bounds_and_total_accounting(self):
        value = self.fixture(True)
        for key, replacement in [('path', '../index.json'), ('storedAs', 'index-02.json.gz'), ('bytes', 64 * 1024 * 1024 + 1)]:
            capsule = copy.deepcopy(value[1]); capsule['indices'][0][key] = replacement
            with self.assertRaises(RuntimeError):
                self.read(value, capsule)
        capsule = copy.deepcopy(value[1]); capsule['completeIndexBytes'] += 1
        with self.assertRaises(RuntimeError):
            self.read(value, capsule)

    def test_full_plan_comparison_preserves_json_boolean_types(self):
        for key, replacement in [('runtimeParity', 0), ('sourceSetSha256', 'wrong'), ('entries', ['forged.rs'])]:
            value = self.fixture(alter=lambda values: values[0].__setitem__(key, replacement))
            with self.assertRaisesRegex(RuntimeError, 'complete original plan DATA'):
                self.read(value)

    def test_owned_index_cannot_claim_execution_authority(self):
        value = self.fixture(True, lambda values: values[1].__setitem__('moduleStartupEquivalent', True))
        with self.assertRaises(RuntimeError):
            self.read(value)


if __name__ == '__main__':
    unittest.main()
