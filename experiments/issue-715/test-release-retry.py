#!/usr/bin/env python3
"""Offline exact-byte and source-gate regressions, using production helpers."""
import base64
import contextlib
import hashlib
import importlib.util
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock
import urllib.error

ROOT = Path(__file__).resolve().parents[2]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


registry = module('registry', 'registry-distributions.py')
retry = module('retry', 'prepare-registry-retry.py')


class Distributions(unittest.TestCase):
    def test_npm_missing_allows_publish_but_errors_and_different_bytes_fail(self):
        with tempfile.TemporaryDirectory() as root:
            asset = Path(root) / 'package.tgz'
            asset.write_bytes(b'attested tarball')
            record = {'name': '@link-assistant/router', 'version': '1.18.2', 'dist': {
                'tarball': 'https://registry.npmjs.org/exact.tgz',
                'integrity': 'sha512-' + base64.b64encode(hashlib.sha512(asset.read_bytes()).digest()).decode()}}
            self.assertFalse(registry.npm_identity('1.18.2', asset, lambda _: None))
            self.assertTrue(registry.npm_identity('1.18.2', asset, lambda _: record, lambda _: asset.read_bytes()))
            with self.assertRaisesRegex(ValueError, 'differs'):
                registry.npm_identity('1.18.2', asset, lambda _: record, lambda _: b'rebuilt')
            def unauthorized(_):
                raise PermissionError('registry denied publication')
            with self.assertRaises(PermissionError):
                registry.npm_identity('1.18.2', asset, unauthorized)
            record['version'] = '1.18.1'
            with self.assertRaisesRegex(ValueError, 'identity'):
                registry.npm_identity('1.18.2', asset, lambda _: record)

    def test_python_requires_complete_matching_unyanked_distributions(self):
        with tempfile.TemporaryDirectory() as root:
            assets = [Path(root)/'link_assistant_router-1.18.2-py3-none-any.whl', Path(root)/'link_assistant_router-1.18.2.tar.gz']
            for asset in assets:
                asset.write_bytes(asset.name.encode())
            record = {'info': {'name': 'link-assistant-router', 'version': '1.18.2'}, 'urls': [
                {'filename': a.name, 'url': a.name, 'digests': {'sha256': hashlib.sha256(a.read_bytes()).hexdigest()}, 'yanked': False}
                for a in assets]}
            self.assertFalse(registry.python_identity('1.18.2', assets, lambda _: None))
            self.assertTrue(registry.python_identity('1.18.2', assets, lambda _: record, lambda name: (Path(root)/name).read_bytes()))
            with self.assertRaisesRegex(ValueError, 'differs'):
                registry.python_identity('1.18.2', assets, lambda _: record, lambda _: b'rebuilt')
            record['urls'][0]['yanked'] = True
            with self.assertRaisesRegex(ValueError, 'yanked'):
                registry.python_identity('1.18.2', assets, lambda _: record)
            record['urls'].pop()
            with self.assertRaisesRegex(ValueError, 'set differs'):
                registry.python_identity('1.18.2', assets, lambda _: record)

    def test_python_distribution_assets_ignore_publish_attestation_sidecars(self):
        # Issue #806: after pypa/gh-action-pypi-publish uploads 1.25.4, dist/
        # also holds its .publish.attestation sidecars. They are not
        # distributions and must not fail the post-publication verification.
        version = '1.25.4'
        wheel, sdist = f'link_assistant_router-{version}-py3-none-any.whl', f'link_assistant_router-{version}.tar.gz'
        with tempfile.TemporaryDirectory() as root:
            dist = Path(root)
            for name in [wheel, sdist, f'{wheel}.publish.attestation', f'{sdist}.publish.attestation']:
                (dist/name).write_bytes(name.encode())
            assets = registry.python_distribution_assets(dist, version)
            self.assertEqual([a.name for a in assets], [wheel, sdist])
            record = {'info': {'name': 'link_assistant_router', 'version': version}, 'urls': [
                {'filename': a.name, 'url': a.name, 'digests': {'sha256': hashlib.sha256(a.read_bytes()).hexdigest()}, 'yanked': False}
                for a in assets]}
            self.assertTrue(registry.python_identity(version, assets, lambda _: record, lambda name: (dist/name).read_bytes()))
            # The exact-set check against PyPI still fails closed on an unexpected third distribution.
            record['urls'].append({**record['urls'][0], 'filename': f'link_assistant_router-{version}-cp312-abi3-manylinux_2_28_x86_64.whl'})
            with self.assertRaisesRegex(ValueError, 'set differs'):
                registry.python_identity(version, assets, lambda _: record)

    def test_python_distribution_assets_reject_missing_or_extra_local_distributions(self):
        version = '1.25.4'
        wheel, sdist = f'link_assistant_router-{version}-py3-none-any.whl', f'link_assistant_router-{version}.tar.gz'
        cases = {
            'missing wheel': [sdist, f'{sdist}.publish.attestation'],
            'missing sdist': [wheel, f'{wheel}.publish.attestation'],
            'only sidecars': [f'{wheel}.publish.attestation', f'{sdist}.publish.attestation'],
            'extra wheel': [wheel, sdist, f'link_assistant_router-{version}-cp312-abi3-manylinux_2_28_x86_64.whl'],
            'extra format': [wheel, sdist, f'link_assistant_router-{version}.zip'],
            'other version': [wheel, sdist, 'link_assistant_router-1.25.40.tar.gz'],
            'prefix only': ['link_assistant_router-1.25.40-py3-none-any.whl', 'link_assistant_router-1.25.40.tar.gz'],
            'empty': [],
        }
        for case, names in cases.items():
            with self.subTest(case=case), tempfile.TemporaryDirectory() as root:
                for name in names:
                    (Path(root)/name).write_bytes(name.encode())
                with self.assertRaisesRegex(ValueError, 'exact attested Python wheel and sdist'):
                    registry.python_distribution_assets(Path(root), version)

    def test_python_cli_verifies_dist_with_attestation_sidecars(self):
        # Drive main() as the workflow does, with only the network replaced.
        version = '1.25.4'
        wheel, sdist = f'link_assistant_router-{version}-py3-none-any.whl', f'link_assistant_router-{version}.tar.gz'
        with tempfile.TemporaryDirectory() as root:
            dist = Path(root)
            for name in [wheel, sdist, f'{wheel}.publish.attestation', f'{sdist}.publish.attestation']:
                (dist/name).write_bytes(name.encode())
            record = {'info': {'name': 'link-assistant-router', 'version': version}, 'urls': [
                {'filename': n, 'url': n, 'digests': {'sha256': hashlib.sha256(n.encode()).hexdigest()}, 'yanked': False}
                for n in [wheel, sdist]]}
            installed = []
            argv = ['registry-distributions.py', 'python', '--version', version, '--assets', str(dist)]
            network = (lambda _: record, lambda name: (dist/name).read_bytes())
            with mock.patch.object(registry.python_identity, '__defaults__', network), \
                    mock.patch.object(registry, 'install', lambda *call: installed.append(call)):
                for extra, expected in [([], 'Verified registry hashes'), (['--probe'], 'present=true')]:
                    output = io.StringIO()
                    with mock.patch.object(sys, 'argv', argv + extra), contextlib.redirect_stdout(output):
                        registry.main()
                    self.assertIn(expected, output.getvalue())
            self.assertEqual([call[:2] for call in installed], [('python', version)])

    def test_retry_requires_exact_tag_repository_workflow_and_successful_gates(self):
        record = {'head_sha': 'commit', 'path': '.github/workflows/release.yml', 'repository': {'full_name': 'link-assistant/router'}, 'head_branch': 'v1.18.2', 'event': 'workflow_dispatch'}
        jobs = [{'name': name, 'conclusion': 'success'} for name in ['Verify published release provenance', 'Verify macOS client lifecycle']]
        retry.validate_run(record, jobs, 'link-assistant/router', '1.18.2', 'commit')
        for key, bad in [('head_sha', 'other'), ('path', 'other.yml'), ('head_branch', 'main'), ('event', 'pull_request')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                retry.validate_run({**record, key: bad}, jobs, 'link-assistant/router', '1.18.2', 'commit')
        for conclusion in ['skipped', 'failure', None]:
            with self.subTest(conclusion=conclusion), self.assertRaises(ValueError):
                retry.validate_run(record, [jobs[0], {**jobs[1], 'conclusion': conclusion}], 'link-assistant/router', '1.18.2', 'commit')

    def test_workflow_supports_existing_assets_and_exact_hash_checks(self):
        workflow = (ROOT/'.github/workflows/release.yml').read_text()
        self.assertTrue('prepare-registry-retry:' in workflow, "missing retry job")
        self.assertIn('scripts/registry-distributions.py npm', workflow)
        self.assertIn('scripts/registry-distributions.py python', workflow)
        self.assertIn("needs.prepare-registry-retry.result == 'success'", workflow)
        final = workflow.split('  finalize-release:', 1)[1].split('  changelog-pr:', 1)[0]
        for required in ["needs.publish-npm.result == 'success'", "needs.publish-python.result == 'success'"]:
            self.assertTrue(required in final, f'promotion lost required gate: {required}')
        self.assertLess(final.index('Wait for Crate availability'), final.index('Promote verified release'))
        prepare = workflow.split('  prepare-registry-retry:', 1)[1].split('  publish-npm:', 1)[0]
        for required in ['--source-digest "$RELEASE_COMMIT"', 'sha256sum -c', 'scripts/check-release-provenance.rs']:
            self.assertTrue(required in prepare, f'retry lost identity verification: {required}')
        self.assertNotIn('cargo build', prepare)
        self.assertNotIn('gh release upload', prepare)


if __name__ == '__main__':
    unittest.main(verbosity=2)
