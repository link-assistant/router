#!/usr/bin/env python3
"""Prepare only the checksum-verified Node binary needed by compiler checks."""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

root = Path('experiments/issue-784/toolchain')
root.mkdir(exist_ok=True)
name = 'node-v20.20.2-linux-x64'
archive = root / (name + '.tar.xz')
base = 'https://nodejs.org/dist/v20.20.2/'
sums = root / 'SHASUMS256.txt'
for path, url in [(sums, base + sums.name), (archive, base + archive.name)]:
    if path.exists():
        raise SystemExit('Refusing to replace existing temporary input: ' + str(path))
    subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                    '--output', str(path), url], check=True)
expected = next(line.split()[0] for line in sums.read_text().splitlines()
                if line.split()[-1] == archive.name)
with archive.open('rb') as source:
    actual = hashlib.file_digest(source, 'sha256').hexdigest()
if actual != expected:
    raise SystemExit('Official archive checksum differs')
binary = root / 'node20/bin/node'
binary.parent.mkdir(parents=True)
with tarfile.open(archive, 'r:xz') as packed:
    member = packed.getmember(name + '/bin/node')
    if not member.isfile() or member.size > 150 * 1024 * 1024:
        raise SystemExit('Expected bounded ordinary Node executable')
    with packed.extractfile(member) as source, binary.open('xb') as target:
        while block := source.read(1024 * 1024):
            target.write(block)
binary.chmod(0o755)
version = subprocess.check_output([str(binary), '--version'], text=True).strip()
if version != 'v20.20.2':
    raise SystemExit('Unexpected Node version: ' + version)
receipt = {'archive': str(archive), 'archiveSha256': actual,
           'officialChecksumUrl': base + sums.name, 'binary': str(binary),
           'binarySha256': hashlib.sha256(binary.read_bytes()).hexdigest(),
           'version': version, 'purpose': 'Complete compiler receiving checks only'}
Path('ci-logs/issue-784-restart-2/storage-node-toolchain.json').write_text(
    json.dumps(receipt) + '\n')
print(json.dumps(receipt))
