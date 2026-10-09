#!/usr/bin/env python3
"""Build Router, publish its contracts, and run catalog/CLI regression tests.

The generated source copy enables only catalog and CLI tests, avoiding the
workspace's known libtest compilation memory limit. Production code is intact.
"""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / 'experiments/issue-727'
ENV = {**os.environ, 'CARGO_BUILD_JOBS': '1', 'CARGO_PROFILE_DEV_DEBUG': '0',
       'RUSTC_WRAPPER': str(ROOT / 'experiments/issue-703/rustc_memory_wrapper.py')}
ENV.pop('CODEX_HOME', None)
parser = argparse.ArgumentParser(__doc__)
parser.add_argument('--tests-only', action='store_true',
                    help='reuse an already built binary and generated contracts')
args = parser.parse_args()


def run(command, name, environment=ENV):
    print(name, flush=True)
    with (LOGS / (name + '.log')).open('wb') as log:
        subprocess.run(command, cwd=ROOT, env=environment, stdout=log,
                       stderr=log, check=True)


if not args.tests_only:
    run(['cargo', 'build', '--locked', '--all-features', '--bins'], 'build')
    run(['python3', 'scripts/generate-contracts.py'], 'generate-contracts')
    run(['python3', 'scripts/generate-bindings.py'], 'generate-bindings')
run(['rust-script', 'experiments/issue-703/shard-unit-tests.rs'], 'prepare-shards')
focused = ROOT / 'target/issue-727-focused'
if focused.exists():
    shutil.rmtree(focused)
shutil.copytree(ROOT / 'target/local-unit-shards', focused, symlinks=True)
for path in (focused / 'src').rglob('*.rs'):
    enabled = '0' if path.name in ['cli_tests.rs', 'model_catalog_sources_tests.rs',
                                 'model_catalog_sources_routing_tests.rs'] else '1'
    path.write_text(re.sub(r'#\[cfg\(router_local_unit_shard = "[0-7]"\)\]',
                          f'#[cfg(router_local_unit_shard = "{enabled}")]', path.read_text()))
wrapper = focused / 'focused.py'
wrapper.write_text((focused / 'shard-0.py').read_text().replace(
    str(ROOT / 'target/local-unit-shards'), str(focused)))
wrapper.chmod(0o700)
environment = {**ENV, 'RUSTC_WORKSPACE_WRAPPER': str(wrapper)}
run(['cargo', 'test', '--locked', '--all-features', '--lib', 'model_catalog_sources'],
    'focused-sources', environment)
run(['cargo', 'test', '--locked', '--all-features', '--lib', 'cli::tests'],
    'focused-cli', environment)
run(['python3', 'experiments/issue-727/reproduce.py'], 'cli-after')
print('All focused checks passed', flush=True)
