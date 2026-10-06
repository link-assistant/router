#!/usr/bin/env python3
"""Inspect the finite local build cache for pre-fix binaries, without rebuilding."""
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
for binary in sorted((root / 'target/debug/deps').glob('router-*')):
    if not re.fullmatch(r'router-[a-f0-9]+', binary.name):
        continue
    result = subprocess.run([str(binary), 'version', '--json'], capture_output=True,
                            text=True, timeout=5)
    try:
        version = json.loads(result.stdout)
    except ValueError:
        continue
    if version.get('operation') == 'version':
        print(binary, version['data'])
