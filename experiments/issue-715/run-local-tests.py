#!/usr/bin/env python3
"""Run every Rust unit test and integration target within this 3 GiB workspace.

Reuse the documented AST unit sharder; CI runs ordinary unsharded commands.
Only compilation is split. Every production function and test body is intact,
and each resulting test executable uses the default parallel test scheduler.
"""
import argparse
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / 'ci-logs'
LOGS.mkdir(exist_ok=True)
environment = {
    **os.environ,
    'CARGO_BUILD_JOBS': '1',
    'CARGO_PROFILE_DEV_DEBUG': '0',
    'CARGO_PROFILE_TEST_CODEGEN_UNITS': '1024',
    'RUSTC_WRAPPER': str(ROOT/'experiments/issue-703/rustc_memory_wrapper.py'),
}
environment.pop('CODEX_HOME', None)


def run(command, log, env=environment):
    with (LOGS/log).open('w') as output:
        subprocess.run(command, cwd=ROOT, env=env, stdout=output, stderr=output, check=True)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--start-shard', type=int, choices=range(8), default=0,
                    help='resume after preserved passing shards')
args = parser.parse_args()
run(['rust-script', 'experiments/issue-703/shard-unit-tests.rs'], '715-unit-prepare.log')
inventory = set()
for shard in range(args.start_shard):
    assert re.search(r'test result: ok\.', (LOGS/f'715-unit-{shard}.log').read_text())
    inventory.update(re.findall(r'^([\w:]+): test$', (LOGS/f'715-unit-{shard}-list.log').read_text(), re.MULTILINE))
for shard in range(args.start_shard, 8):
    env = {**environment, 'RUSTC_WORKSPACE_WRAPPER': str(ROOT/f'target/local-unit-shards/shard-{shard}.py')}
    print(f'Run default-parallel unit shard {shard}', flush=True)
    command = ['cargo', 'test', '--locked', '--lib', '--all-features']
    run(command + ['--', '--list'], f'715-unit-{shard}-list.log', env)
    run(command, f'715-unit-{shard}.log', env)
    inventory.update(re.findall(r'^([\w:]+): test$', (LOGS/f'715-unit-{shard}-list.log').read_text(), re.MULTILINE))
(LOGS/'715-unit-inventory.txt').write_text('\n'.join(sorted(inventory))+'\n')
print(f'All {len(inventory)} distinct unit tests passed', flush=True)

# Select the same test bodies for the last library run and execute all ordinary
# binaries, integrations and documentation targets. Real-container tests are
# run separately, because default-name fixtures share Docker object names.
print('Run all binaries, integration targets and documentation tests', flush=True)
run(['cargo', 'test', '--locked', '--all-features', '--no-fail-fast'], '715-full-tests.log', env)
print('All Rust targets passed', flush=True)
