#!/usr/bin/env python3
"""Offline regressions for the v1.25.4 registry publication failures (issue #805).

1. npm: a package that has never existed cannot have a trusted publisher, and
   with an empty NPM_TOKEN `npm publish` failed with a generic ENEEDAUTH. The
   publish preflight must fail first with the exact bootstrap steps.
2. PyPI: pypa/gh-action-pypi-publish wrote `*.publish.attestation` files into
   `dist/`, so the post-publication verifier's broad glob saw four files and
   rejected a correct upload. Only the wheel and sdist form the distribution.
"""
import importlib.util
import os
import re
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
HELPER = ROOT / 'scripts' / 'registry-distributions.py'
spec = importlib.util.spec_from_file_location('registry', HELPER)
registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registry)


class NpmPublishPreflight(unittest.TestCase):
    def test_missing_package_without_token_fails_with_bootstrap_steps(self):
        with self.assertRaises(registry.NpmBootstrapRequired) as raised:
            registry.npm_publish_preflight('1.25.4', False, '45694212338', 'link-assistant/router', lambda _: None)
        message = str(raised.exception)
        for required in ['never been published', 'NPM_TOKEN', 'Trusted Publishing',
                         'release_mode=retry-registries', '-f release_version=1.25.4', '-f source_run=45694212338',
                         'scripts/bootstrap-npm-package.sh 1.25.4 --publish', 'link-assistant-router-1.25.4.tgz',
                         'workflow release.yml', 'revoke NPM_TOKEN']:
            self.assertIn(required, message)

    def test_missing_package_with_bootstrap_token_may_publish(self):
        self.assertFalse(registry.npm_publish_preflight('1.25.4', True, load=lambda _: None))

    def test_existing_package_uses_trusted_publisher(self):
        seen = []
        self.assertTrue(registry.npm_publish_preflight('1.25.5', False, load=lambda url: seen.append(url) or {'name': '@link-assistant/router'}))
        self.assertEqual(seen, [registry.NPM_PACKAGE_URL])

    def test_registry_errors_are_not_treated_as_a_missing_package(self):
        def unavailable(_):
            raise OSError('registry unavailable')
        with self.assertRaises(OSError):
            registry.npm_publish_preflight('1.25.4', False, load=unavailable)

    def test_cli_emits_a_github_error_annotation(self):
        # Exercise the real CLI with an offline registry stub via sitecustomize.
        with tempfile.TemporaryDirectory() as root:
            Path(root, 'sitecustomize.py').write_text(
                'import urllib.request, urllib.error\n'
                'def deny(request, timeout=None):\n'
                '    raise urllib.error.HTTPError(getattr(request, "full_url", request), 404, "Not Found", {}, None)\n'
                'urllib.request.urlopen = deny\n')
            env = {**os.environ, 'PYTHONPATH': root, 'NPM_TOKEN_CONFIGURED': 'false', 'GITHUB_RUN_ID': '45694212338',
                   'GITHUB_REPOSITORY': 'link-assistant/router', 'SOURCE_RUN': ''}
            result = subprocess.run([sys.executable, str(HELPER), 'npm', '--version', '1.25.4', '--assets', root,
                                     '--publish-preflight'], env=env, capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertTrue(result.stdout.startswith('::error title=npm first-publish bootstrap required'), result.stdout)
            self.assertIn('-f source_run=45694212338', result.stdout)
            env['NPM_TOKEN_CONFIGURED'] = 'true'
            result = subprocess.run([sys.executable, str(HELPER), 'npm', '--version', '1.25.4', '--assets', root,
                                     '--publish-preflight'], env=env, capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stderr)


class PythonDistributionSelection(unittest.TestCase):
    def write(self, root, *names):
        for name in names:
            Path(root, name).write_bytes(name.encode())

    def test_publish_attestations_do_not_change_the_distribution_set(self):
        with tempfile.TemporaryDirectory() as root:
            self.write(root, 'link_assistant_router-1.25.4-py3-none-any.whl', 'link_assistant_router-1.25.4.tar.gz',
                       'link_assistant_router-1.25.4-py3-none-any.whl.publish.attestation',
                       'link_assistant_router-1.25.4.tar.gz.publish.attestation')
            selected = registry.python_distribution_assets(Path(root), '1.25.4')
            self.assertEqual([p.name for p in selected],
                             ['link_assistant_router-1.25.4-py3-none-any.whl', 'link_assistant_router-1.25.4.tar.gz'])

    def test_missing_or_ambiguous_distributions_still_fail(self):
        cases = [
            ['link_assistant_router-1.25.4-py3-none-any.whl'],
            ['link_assistant_router-1.25.4.tar.gz'],
            ['link_assistant_router-1.25.4-py3-none-any.whl', 'link_assistant_router-1.25.4-py2-none-any.whl',
             'link_assistant_router-1.25.4.tar.gz'],
            ['link_assistant_router-1.25.40-py3-none-any.whl', 'link_assistant_router-1.25.40.tar.gz'],
        ]
        for names in cases:
            with self.subTest(names=names), tempfile.TemporaryDirectory() as root:
                self.write(root, *names)
                with self.assertRaisesRegex(ValueError, 'exact attested Python wheel and sdist'):
                    registry.python_distribution_assets(Path(root), '1.25.4')


class Workflow(unittest.TestCase):
    def test_npm_job_runs_the_preflight_before_publishing(self):
        workflow = (ROOT / '.github/workflows/release.yml').read_text()
        job = workflow.split('  publish-npm:', 1)[1].split('  publish-python:', 1)[0]
        preflight = job.index('--publish-preflight')
        self.assertLess(job.index('--probe'), preflight)
        self.assertLess(preflight, job.index('npm publish "link-assistant-router-'))
        self.assertIn("NPM_TOKEN_CONFIGURED: ${{ secrets.NPM_TOKEN != '' }}", job)
        self.assertIn('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}', job)

    def test_bootstrap_script_never_rebuilds(self):
        script = (ROOT / 'scripts/bootstrap-npm-package.sh').read_text()
        self.assertIn('gh attestation verify', script)
        self.assertIn('--source-digest "$commit"', script)
        for forbidden in [r'\bnpm pack\b', r'\bnpm run build\b', r'\bcargo\b']:
            self.assertIsNone(re.search(forbidden, script), f'bootstrap must not rebuild: {forbidden}')
        subprocess.run(['bash', '-n', str(ROOT / 'scripts/bootstrap-npm-package.sh')], check=True, timeout=30)


if __name__ == '__main__':
    unittest.main(verbosity=2)
