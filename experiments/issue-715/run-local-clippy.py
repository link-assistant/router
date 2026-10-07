#!/usr/bin/env python3
"""Check all ordinary targets and each unit shard within a 3 GiB workspace.

The combined libtest Clippy target also exceeds this workspace's memory cap.
Prepare independent current-source copies so ongoing test builds are intact.
Only sharding-created unused helper warnings are suppressed in those copies.
"""
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT/'target/issue-715-lint-project'
PROJECT.mkdir(parents=True, exist_ok=True)
for entry in ROOT.iterdir():
    if entry.name != 'target' and not (PROJECT/entry.name).exists():
        (PROJECT/entry.name).symlink_to(entry, target_is_directory=entry.is_dir())
ENV = {**os.environ, 'CARGO_BUILD_JOBS': '1', 'CARGO_PROFILE_DEV_DEBUG': '0', 'RUST_LOG': 'warn'}
with (ROOT/'ci-logs/715-lint-prepare.log').open('w') as output:
    subprocess.run(['rust-script', str(ROOT/'experiments/issue-703/shard-unit-tests.rs')],
                   cwd=PROJECT, env=ENV, stdout=output, stderr=output, check=True)
shards = PROJECT/'target/local-unit-shards'
library = shards/'src/lib.rs'
library.write_text('#![allow(dead_code, unused_imports)]\n'+library.read_text())
for shard in range(8):
    wrapper = shards/f'shard-{shard}.py'
    source = wrapper.read_text()
    # Non-test production library builds always use the actual repository src.
    source = source.replace('a=[', "if '--test' in a: a=[", 1)
    wrapper.write_text(source)
    env = {**ENV, 'RUSTC_WORKSPACE_WRAPPER': str(wrapper)}
    command = ['cargo', 'clippy', '--locked', '--all-features']
    command += ['--all-targets'] if shard == 0 else ['--lib', '--tests']
    command += ['--', '-D', 'warnings']
    print(f'Clippy unit shard {shard}', flush=True)
    with (ROOT/f'ci-logs/715-clippy-{shard}.log').open('w') as output:
        subprocess.run(command, cwd=ROOT, env=env, stdout=output, stderr=output, check=True)
print('All production targets and unit shards passed Clippy', flush=True)
