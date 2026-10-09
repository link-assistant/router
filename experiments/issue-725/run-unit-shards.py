#!/usr/bin/env python3
"""Run every unit test in finite, memory-bounded shards on small Linux workers.

The Rust parser recognizes test functions and property-test macros, avoiding
matches in strings/comments. Each entry point appears in exactly one shard;
production code and non-test fixture helpers remain unchanged in a temporary
copy. The normal workspace is never edited. Dependencies reuse its target cache.
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
tool = root / 'experiments/issue-725/test-sharder'
environment = os.environ.copy()
environment.update(CARGO_BUILD_JOBS='1', CARGO_PROFILE_DEV_DEBUG='0', MALLOC_ARENA_MAX='2')
subprocess.run(['cargo', 'build', '--locked', '--manifest-path', str(tool / 'Cargo.toml')],
               env=environment, check=True)
parser = tool / 'target/debug/router-test-sharder'
environment['CARGO_TARGET_DIR'] = str(root / 'target')
environment['ROUTER_BUILD_RSS_LIMIT_MIB'] = '2350'
failures = []
with tempfile.TemporaryDirectory(prefix='router-725-unit-') as temporary:
    project = Path(temporary)
    for entry in root.iterdir():
        if entry.name not in {'src', 'target', '.git', 'experiments', 'ci-logs'}:
            (project / entry.name).symlink_to(entry, target_is_directory=entry.is_dir())
    for shard in range(4):
        if (project / 'src').exists():
            shutil.rmtree(project / 'src')
        shutil.copytree(root / 'src', project / 'src')
        sources = sorted(str(path) for path in (project / 'src').rglob('*.rs'))
        subprocess.run([str(parser), str(shard), '4', *sources], check=True)
        command = ['python3', str(root / 'experiments/issue-719/bounded-build.py'),
                   'cargo', 'test', '--locked', '--all-features', '--lib', '--bins',
                   '--manifest-path', str(project / 'Cargo.toml'), '--config',
                   'profile.dev.package.link-assistant-router.codegen-units=1024']
        result = subprocess.call(command, cwd=project, env=environment)
        if result:
            failures.append((shard, result))
print(f'Failed shards: {failures}', flush=True)
raise SystemExit(bool(failures))
