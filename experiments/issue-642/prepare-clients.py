#!/usr/bin/env python3
"""Bounded #641 preparation and Cargo cache regressions with synthetic CLIs."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
RUNNER = shutil.which('rust-script')
assert RUNNER
with tempfile.TemporaryDirectory(prefix='router-preparation-') as directory:
    temp = Path(directory)
    bins = temp / 'bin'
    bins.mkdir()
    environment = dict(os.environ)
    for key in list(environment):
        if key.startswith('ROUTER_REAL_CLIENT_'):
            del environment[key]
    environment['PATH'] = f'{bins}:{Path(shutil.which("cargo")).parent}:/usr/bin:/bin'
    expected_key = 'ROUTER_REAL_CLIENT_CODEX_VERSION'

    def check(version, expected, status):
        fake = bins / 'codex'
        fake.write_text('#!/bin/sh\nprintf "%s\\n" ' + repr(version) + '\n')
        fake.chmod(0o700)
        env = dict(environment)
        if expected is not None:
            env[expected_key] = expected
        result = subprocess.run([RUNNER, 'scripts/verify-contracts.rs', '--prepare-clients', '--client', 'codex', '--output', str(temp / 'result.json')], cwd=ROOT, env=env, capture_output=True, timeout=180)
        report = json.loads((temp / 'result.json').read_text())
        entry, = report['client_preparation']
        assert entry['status'] == status, (result.returncode, entry)
        assert entry['expected'] == expected, entry
        assert not report['parity'], report
        assert (result.returncode == 1) == (status == 'failed'), (result.returncode, entry)
        print(json.dumps(entry))
        return entry

    assert check('codex-cli 0.158.0', None, 'prepared')['observed'] == '0.158.0'
    check('codex-cli 0.158.0', '0.158.0', 'prepared')
    check('codex-cli 0.158.0', '0.154.0', 'failed')
    check('unsupported version output', None, 'failed')
    check('', None, 'failed')

    # Cargo tracks option_env! even when its binary already exists. Exercise
    # the same setting consumed by real_clients_test, without paid inference.
    project = temp / 'cache'
    (project / 'src').mkdir(parents=True)
    (project / 'Cargo.toml').write_text('[package]\nname="version-cache-regression"\nversion="0.1.0"\nedition="2024"\n[workspace]\n')
    (project / 'src/main.rs').write_text('fn main(){println!("{}",option_env!("ROUTER_REAL_CLIENT_CODEX_VERSION").unwrap_or("0.154.0"));}\n')
    for version in ['0.158.0', '0.159.0']:
        entry = check(f'codex-cli {version}', None, 'prepared')
        env = dict(environment, **{expected_key: entry['observed']})
        result = subprocess.run(['cargo', 'run', '--quiet', '--offline'], cwd=project, env=env, capture_output=True, text=True, timeout=180)
        assert result.returncode == 0 and result.stdout.strip() == version, result
    (bins / 'codex').unlink()
    if shutil.which('codex', path=environment['PATH']) is None:
        result = subprocess.run([RUNNER, 'scripts/verify-contracts.rs', '--prepare-clients', '--client', 'codex', '--output', str(temp / 'result.json')], cwd=ROOT, env=environment, capture_output=True, timeout=180)
        entry, = json.loads((temp / 'result.json').read_text())['client_preparation']
        assert entry['status'] == 'not-proven' and entry['observed'] is None, entry
        print(json.dumps(entry))
print('Preparation, mismatch, malformed/missing output and cached compile-time versions verified.')
