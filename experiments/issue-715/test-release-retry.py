#!/usr/bin/env python3
"""Offline exact-byte and source-gate regressions, using production helpers."""
import base64
import contextlib
import hashlib
import importlib.util
import io
import json
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
                {'filename': n, 'url': f'https://files.pythonhosted.org/{n}',
                 'digests': {'sha256': hashlib.sha256(n.encode()).hexdigest()}, 'yanked': False}
                for n in [wheel, sdist]]}
            installed = []
            argv = ['registry-distributions.py', 'python', '--version', version, '--assets', str(dist)]

            def open_url(request, timeout):
                if request.full_url == f'https://pypi.org/pypi/link-assistant-router/{version}/json':
                    return io.BytesIO(json.dumps(record).encode())
                return io.BytesIO((dist / request.full_url.rsplit('/', 1)[-1]).read_bytes())

            with mock.patch.object(registry.urllib.request, 'urlopen', open_url), \
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
        python = workflow.split('  publish-python:', 1)[1].split('  finalize-release:', 1)[0]
        python_command = 'python3 scripts/registry-distributions.py python --version "$RELEASE_VERSION" --assets dist'
        probe = python.index(f'{python_command} --probe >> "$GITHUB_OUTPUT"')
        publish = python.index('uses: pypa/gh-action-pypi-publish@')
        verify = python.index(f'{python_command}\n')
        self.assertLess(probe, publish)
        self.assertLess(publish, verify)
        self.assertIn("if: steps.registry.outputs.present != 'true'", python[publish:verify])
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


class PyPIPropagation(unittest.TestCase):
    version = '1.25.6'
    metadata_url = f'https://pypi.org/pypi/link-assistant-router/{version}/json'

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.dist = Path(temporary.name)
        self.urls = {}
        for filename in [f'link_assistant_router-{self.version}-py3-none-any.whl',
                         f'link_assistant_router-{self.version}.tar.gz']:
            content = filename.encode()
            (self.dist / filename).write_bytes(content)
            self.urls[f'https://files.pythonhosted.org/{filename}'] = content
        self.record = {
            'info': {'name': 'link-assistant-router', 'version': self.version},
            'urls': [
                {'filename': url.rsplit('/', 1)[-1], 'url': url, 'yanked': False,
                 'digests': {'sha256': hashlib.sha256(content).hexdigest()}}
                for url, content in self.urls.items()
            ],
        }
        self.read_metadata = mock.Mock(return_value=self.record)
        self.requests = []
        self.install = mock.Mock()
        self.elapsed = 0
        self.clock = mock.Mock()
        self.clock.monotonic.side_effect = lambda: self.elapsed
        self.clock.sleep.side_effect = self.advance_clock

    def advance_clock(self, seconds):
        self.elapsed += seconds

    def http_error(self, status):
        return urllib.error.HTTPError(self.metadata_url, status, 'test response', {}, None)

    def open_url(self, request, timeout):
        url = request.full_url
        self.requests.append(url)
        if url == self.metadata_url:
            return io.BytesIO(json.dumps(self.read_metadata()).encode())
        return io.BytesIO(self.urls[url])

    def verify(self, *arguments):
        argv = ['registry-distributions.py', 'python', '--version', self.version,
                '--assets', str(self.dist), *arguments]
        output = io.StringIO()
        with mock.patch.object(sys, 'argv', argv), contextlib.redirect_stdout(output), \
                mock.patch.object(registry, 'time', self.clock), \
                mock.patch.object(registry.urllib.request, 'urlopen', self.open_url), \
                mock.patch.object(registry, 'install', self.install):
            registry.main()
        return output.getvalue()

    def test_post_publish_verifies_after_metadata_propagates(self):
        self.read_metadata.side_effect = [self.http_error(404) for _ in range(3)] + [self.record]
        self.assertIn('Verified registry hashes and ordinary exact-version python install', self.verify())
        self.assertEqual(self.requests, [self.metadata_url] * 4 + list(self.urls))
        self.assertEqual(self.clock.sleep.call_args_list, [mock.call(2), mock.call(4), mock.call(8)])
        self.install.assert_called_once_with('python', self.version, mock.ANY)

    def test_post_publish_fails_if_metadata_is_still_absent_after_timeout(self):
        self.read_metadata.side_effect = self.raise_http_404
        with self.assertRaisesRegex(ValueError, 'still absent after waiting 180 seconds'):
            self.verify()
        self.assertEqual(self.elapsed, 180)
        self.assertEqual(self.clock.sleep.call_args_list,
                         [mock.call(seconds) for seconds in [2, 4, 8, 16, 30, 30, 30, 30, 30]])
        self.assertEqual(self.requests, [self.metadata_url] * 10)
        self.install.assert_not_called()

    def raise_http_404(self):
        raise self.http_error(404)

    def test_pre_publish_probe_reports_missing_after_one_lookup(self):
        self.read_metadata.side_effect = [self.http_error(404)]
        self.assertEqual(self.verify('--probe'), 'present=false\n')
        self.assertEqual(self.requests, [self.metadata_url])
        self.clock.sleep.assert_not_called()
        self.install.assert_not_called()

    def test_post_publish_does_not_retry_other_http_or_network_errors(self):
        for error in [self.http_error(401), self.http_error(403), self.http_error(503),
                      urllib.error.URLError('connection failed')]:
            with self.subTest(error=error):
                self.read_metadata.side_effect = [error, self.record]
                with self.assertRaises(type(error)) as caught:
                    self.verify()
                self.assertIs(caught.exception, error)
        self.assertEqual(self.requests, [self.metadata_url] * 4)
        self.clock.sleep.assert_not_called()
        self.install.assert_not_called()

    def test_post_publish_does_not_retry_invalid_visible_metadata(self):
        wheel, sdist = self.record['urls']
        cases = [
            (None, 'null metadata'),
            ({**self.record, 'info': {**self.record['info'], 'version': '1.25.5'}}, 'wrong package identity'),
            ({**self.record, 'urls': [wheel]}, 'distribution set differs'),
            ({**self.record, 'urls': [wheel, sdist, {**wheel, 'filename': 'extra.whl'}]}, 'distribution set differs'),
            ({**self.record, 'urls': [{**wheel, 'yanked': True}, sdist]}, 'distribution is yanked'),
            ({**self.record, 'urls': [{**wheel, 'digests': {'sha256': 'bad'}}, sdist]}, 'differs from the attested asset'),
        ]
        for record, message in cases:
            with self.subTest(message=message):
                self.read_metadata.side_effect = [record, self.record]
                with self.assertRaisesRegex(ValueError, message):
                    self.verify()
        self.assertEqual(self.requests, [self.metadata_url] * len(cases))
        self.clock.sleep.assert_not_called()
        self.install.assert_not_called()


if __name__ == '__main__':
    unittest.main(verbosity=2)
