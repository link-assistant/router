"""Remove only the inactive binary-only toolchain from storage receiving."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
target = root / 'experiments/issue-784/toolchain'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--receipt', type=Path,
                    default=root / 'ci-logs/issue-784-restart-2/storage-node-cleanup.json')
parser.add_argument('--toolchain-receipt', type=Path,
                    default=root / 'ci-logs/issue-784-restart-2/storage-node-toolchain.json')
args = parser.parse_args()
receipt_path = args.receipt.resolve()
if receipt_path.parent != root / 'ci-logs/issue-784-restart-2':
    raise RuntimeError('Cleanup receipts must remain in this investigation directory')
if receipt_path.exists():
    raise RuntimeError('Refusing to overwrite an earlier cleanup receipt')
input_receipt = args.toolchain_receipt.resolve()
if input_receipt.parent != root / 'ci-logs/issue-784-restart-2':
    raise RuntimeError('Toolchain receipts must remain in this investigation directory')
expected = json.loads(input_receipt.read_text())
if not target.is_dir() or target.is_symlink() or sorted(p.name for p in target.iterdir()) != [
        'SHASUMS256.txt', 'node-v20.20.2-linux-x64.tar.xz', 'node20']:
    raise RuntimeError('Unexpected temporary toolchain layout')
for field, digest in [('archive', 'archiveSha256'), ('binary', 'binarySha256')]:
    path = root / expected[field]
    if not path.is_relative_to(target) or path.is_symlink() or not path.is_file():
        raise RuntimeError('Unexpected toolchain input: ' + str(path))
    with path.open('rb') as source:
        if hashlib.file_digest(source, 'sha256').hexdigest() != expected[digest]:
            raise RuntimeError('Toolchain checksum changed: ' + str(path))
references, foreign_unreadable_maps = [], []
needle = str(target).encode()
for process in Path('/proc').iterdir():
    if not process.name.isdigit():
        continue
    try:
        command = process.joinpath('cmdline').read_bytes()
        try:
            mappings = process.joinpath('maps').read_bytes()
        except PermissionError:
            if process.stat().st_uid == os.getuid():
                raise
            foreign_unreadable_maps.append(int(process.name))
            mappings = b''
        if needle in command or needle in mappings:
            references.append(int(process.name))
    except (FileNotFoundError, ProcessLookupError):
        continue
if references:
    raise RuntimeError('Toolchain is still referenced: ' + str(references))
identities, allocated = set(), 0
for path in target.rglob('*'):
    state = path.lstat()
    if path.is_symlink():
        raise RuntimeError('Unexpected linked toolchain member: ' + str(path))
    identity = (state.st_dev, state.st_ino)
    if identity not in identities:
        identities.add(identity)
        allocated += state.st_blocks * 512
before = shutil.disk_usage(root).free
shutil.rmtree(target)
after = shutil.disk_usage(root).free
receipt = {'removedPath': str(target), 'inactiveProcessReferences': references,
           'toolchainReceipt': str(input_receipt),
           'foreignUnreadableMaps': foreign_unreadable_maps,
           'verifiedArchiveSha256': expected['archiveSha256'],
           'verifiedBinarySha256': expected['binarySha256'],
           'distinctFileAllocationRemoved': allocated,
           'filesystemFreeBefore': before, 'filesystemFreeAfter': after,
           'filesystemFreeDelta': after - before,
           'scope': 'Only this storage investigation temporary Node copy; no Rust cache or worker directory.'}
with receipt_path.open('x') as output:
    output.write(json.dumps(receipt) + '\n')
print(json.dumps(receipt))
