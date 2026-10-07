#!/usr/bin/env python3
"""Verify all Rust targets within this workspace's 3 GiB memory limit.

Usage: python3 experiments/issue-717/verify-local.py tests|clippy
Reuse the existing AST unit sharder; test bodies and production code stay intact.
CI runs the ordinary unsharded commands. Logs are preserved in ci-logs/717-*.
"""
import argparse
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / 'ci-logs'
LOGS.mkdir(exist_ok=True)
ENV = {**os.environ, 'CARGO_BUILD_JOBS': '1', 'CARGO_PROFILE_DEV_DEBUG': '0',
       'CARGO_PROFILE_TEST_CODEGEN_UNITS': '1024', 'RUST_LOG': 'warn',
       'ROUTER_LOCAL_MAX_BASELINE_ANON_BYTES': str(900 * 1024 * 1024)}


def run(command, name, env=ENV, cwd=ROOT):
    with (LOGS / f'717-{name}.log').open('w') as output:
        subprocess.run(command, cwd=cwd, env=env, stdout=output,
                       stderr=output, check=True)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode', choices=['tests', 'clippy'])
parser.add_argument('--shards', type=int, choices=range(1, 65), default=16)
parser.add_argument('--start-shard', type=int, choices=range(64), default=0)
args = parser.parse_args()
assert args.start_shard < args.shards
ENV['ROUTER_LOCAL_UNIT_SHARDS'] = str(args.shards)
ENV['RUSTC_WRAPPER'] = str(ROOT / 'experiments/issue-703/rustc_memory_wrapper.py')
project = ROOT
if args.mode == 'clippy':
    # Keep lint copies independent of prepared test copies.
    project = ROOT / 'target/issue-717-lint-project'
    project.mkdir(parents=True, exist_ok=True)
    for entry in ROOT.iterdir():
        destination = project / entry.name
        if entry.name != 'target' and not destination.exists():
            destination.symlink_to(entry, target_is_directory=entry.is_dir())
run(['rust-script', str(ROOT / 'experiments/issue-703/shard-unit-tests.rs')],
    f'{args.mode}-prepare', cwd=project)
shards = project / 'target/local-unit-shards'

if args.mode == 'clippy':
    library = shards / 'src/lib.rs'
    # AST rewriting removes test callers and reformats macro token streams.
    # Exempt only the resulting unused-item and layout lints in these copies;
    # the original production sources and test targets remain fully linted.
    library.write_text('#![allow(dead_code, unused_imports, '
                       'clippy::possible_missing_else, '
                       'clippy::suspicious_else_formatting, '
                       'clippy::semicolon_if_nothing_returned)]\n' + library.read_text())
    for shard in range(args.shards):
        wrapper = shards / f'shard-{shard}.py'
        # Production builds use the actual sources; only libtest is sharded.
        contents = wrapper.read_text().replace('a=[', "if '--test' in a: a=[", 1)
        # Clippy owns RUSTC_WORKSPACE_WRAPPER, so compose both local wrappers
        # through RUSTC_WRAPPER instead of letting Clippy bypass the sharder.
        memory_wrapper = str(ROOT / 'experiments/issue-703/rustc_memory_wrapper.py')
        contents = contents.replace('os.execv(a[0],a)',
                    f'os.execv({memory_wrapper!r}, [{memory_wrapper!r}, *a])')
        wrapper.write_text(contents)
    for shard in range(args.start_shard, args.shards):
        print(f'Clippy unit shard {shard}', flush=True)
        env = {**ENV, 'RUSTC_WRAPPER': str(shards / f'shard-{shard}.py')}
        targets = ['--all-targets'] if shard == 0 else ['--lib', '--tests']
        run(['cargo', 'clippy', '--locked', '--all-features', *targets,
             '--', '-D', 'warnings'], f'clippy-{shard}', env)
    print('All production targets and unit shards passed Clippy', flush=True)
else:
    env = ENV.copy()
    inventory = set()
    for shard in range(args.shards):
        shard_env = {**env, 'RUSTC_WORKSPACE_WRAPPER': str(shards / f'shard-{shard}.py')}
        if shard >= args.start_shard:
            print(f'Run unit shard {shard}', flush=True)
            command = ['cargo', 'test', '--locked', '--lib', '--all-features']
            run(command + ['--', '--list'], f'unit-{shard}-list', shard_env)
            run(command, f'unit-{shard}', shard_env)
        assert re.search(r'test result: ok\.', (LOGS / f'717-unit-{shard}.log').read_text())
        inventory.update(re.findall(r'^([\w:]+): test$',
                         (LOGS / f'717-unit-{shard}-list.log').read_text(), re.MULTILINE))
    (LOGS / '717-unit-inventory.txt').write_text('\n'.join(sorted(inventory)) + '\n')
    print(f'All {len(inventory)} distinct unit tests passed', flush=True)
    print('Run all binary, integration and documentation targets', flush=True)
    run(['cargo', 'test', '--locked', '--all-features', '--no-fail-fast'],
        'full-tests', shard_env)
    print('All Rust targets passed', flush=True)
