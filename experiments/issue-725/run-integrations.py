#!/usr/bin/env python3
"""Run all integration targets separately from the large library test binary.

--prebuilt investigates already compiled binaries without another Cargo build.
That mode reports the binary paths; use the default mode for final validation.
"""
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
os.chdir(root)
metadata = json.loads(subprocess.check_output([
    'cargo', 'metadata', '--locked', '--no-deps', '--format-version', '1',
]))
targets = [target['name'] for package in metadata['packages']
           for target in package['targets'] if 'test' in target['kind']]
print(f'Integration targets: {len(targets)}', flush=True)
environment = os.environ.copy()
environment['CARGO_BUILD_JOBS'] = '1'
if '--prebuilt' not in sys.argv:
    command = ['cargo', 'test', '--locked', '--all-features', '--no-fail-fast']
    for target in targets:
        command.extend(['--test', target])
    raise SystemExit(subprocess.call(command, env=environment))

failures = []
for target in targets:
    binaries = [path for path in (root / 'target/debug/deps').glob(target + '-*')
                if path.is_file() and os.access(path, os.X_OK)]
    if not binaries:
        raise SystemExit(f'Missing compiled target: {target}')
    binary = max(binaries, key=lambda path: path.stat().st_mtime)
    print(f'RUN {target}: {binary}', flush=True)
    if subprocess.call([str(binary)], env=environment) != 0:
        failures.append(target)
print(f'Failed targets: {failures}', flush=True)
raise SystemExit(bool(failures))
