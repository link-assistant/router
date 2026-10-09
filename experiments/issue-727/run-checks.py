#!/usr/bin/env python3
"""Run the complete local Rust suite within the workspace's compiler memory limit.

Uses the existing AST test sharder without changing production code. Logs are
kept under ci-logs/issue-727. CI runs the ordinary, unmodified test suite.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / 'ci-logs/issue-727'
LOGS.mkdir(parents=True, exist_ok=True)
ENV = {**os.environ, 'CARGO_BUILD_JOBS': '1', 'CARGO_PROFILE_DEV_DEBUG': '0',
       'RUSTC_WRAPPER': str(ROOT / 'experiments/issue-703/rustc_memory_wrapper.py')}
ENV.pop('CODEX_HOME', None)
parser = argparse.ArgumentParser(__doc__)
parser.add_argument('--units', action='store_true')
parser.add_argument('--integrations', action='store_true')
parser.add_argument('--start', type=int, default=0)
args = parser.parse_args()
assert 0 <= args.start < 8


def run(command, name, environment=ENV):
    print('Running ' + name, flush=True)
    with (LOGS / (name + '.log')).open('wb') as log:
        subprocess.run(command, cwd=ROOT, env=environment, stdout=log,
                       stderr=log, check=True)


if args.units:
    inventory = set()
    for shard in range(args.start, 8):
        environment = {**ENV, 'RUSTC_WORKSPACE_WRAPPER': str(
            ROOT / f'target/local-unit-shards/shard-{shard}.py')}
        command = ['cargo', 'test', '--locked', '--all-features', '--lib']
        run(command + ['--', '--list'], f'unit-{shard}-list', environment)
        run(command, f'unit-{shard}', environment)
    for shard in range(8):
        names = set(re.findall(r'^([\w:]+): test$',
                    (LOGS / f'unit-{shard}-list.log').read_text(), re.MULTILINE))
        assert not inventory.intersection(names), f'duplicate shard {shard}'
        assert 'test result: ok.' in (LOGS / f'unit-{shard}.log').read_text()
        inventory.update(names)
    (LOGS / 'unit-inventory.txt').write_text('\n'.join(sorted(inventory)) + '\n')
    print(f'All {len(inventory)} distinct unit tests passed', flush=True)

if args.integrations:
    metadata = json.loads(subprocess.check_output(
        ['cargo', 'metadata', '--locked', '--no-deps', '--format-version', '1'],
        cwd=ROOT, env=ENV, text=True))
    package = next(item for item in metadata['packages'] if item['name'] == 'link-assistant-router')
    for target in sorted(package['targets'], key=lambda item: item['name']):
        if target['kind'] == ['test']:
            run(['cargo', 'test', '--locked', '--all-features', '--test', target['name']],
                'integration-' + target['name'])
    run(['cargo', 'test', '--locked', '--all-features', '--bins'], 'binary-tests')
    run(['cargo', 'test', '--locked', '--all-features', '--doc'], 'doc-tests')
    print('All integration, binary and documentation tests passed', flush=True)
