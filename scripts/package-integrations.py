#!/usr/bin/env python3
"""Build the same-version official packages and contracts for a tagged release."""
import hashlib
import json
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
def main():
    import argparse
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('--output', type=Path, default=ROOT/'dist-integrations')
    args = parser.parse_args()
    version = json.loads((ROOT/'schemas/operation-catalog.v1.json').read_text())['version']
    for script in ['generate-contracts.py', 'generate-bindings.py']:
        subprocess.run([sys.executable, str(ROOT/'scripts'/script), '--check'], check=True)
    output = args.output.resolve(); output.mkdir(parents=True, exist_ok=True)
    subprocess.run(['npm', 'pack', '--pack-destination', str(output)], cwd=ROOT/'packages/javascript', check=True)
    subprocess.run([sys.executable, '-m', 'build', '--outdir', str(output), str(ROOT/'packages/python')], check=True)
    with tarfile.open(output/f'router-contracts-{version}.tar.gz', 'w:gz') as archive:
        for directory in ['schemas', 'openapi']:
            archive.add(ROOT/directory, arcname=directory)
    expected = [f'link-assistant-router-{version}.tgz', f'link_assistant_router-{version}-py3-none-any.whl',
                f'link_assistant_router-{version}.tar.gz', f'router-contracts-{version}.tar.gz']
    for name in expected:
        if not (output/name).is_file(): raise SystemExit(f'Missing release distribution: {name}')
    checksums = ''.join(hashlib.sha256((output/name).read_bytes()).hexdigest()+'  '+name+'\n' for name in sorted(expected))
    (output/f'router-integrations-{version}.sha256').write_text(checksums)
    print(f'Built and checksummed official integrations {version}')
if __name__ == '__main__': main()
