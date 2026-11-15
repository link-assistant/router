"""Remove only this attempt's identified, inactive, checksum-recorded Node copy."""
import hashlib
import json
import os
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[2]
target = root / 'experiments/issue-784/toolchain'
assert target.is_dir() and not target.is_symlink()
expected = json.loads((root / 'ci-logs/issue-784-restart-2/toolchain.json').read_text())
archive = target / 'node-v20.20.2-linux-x64.tar.xz'
with archive.open('rb') as stream:
    assert hashlib.file_digest(stream, 'sha256').hexdigest() == expected['sha256']
assert sorted(path.name for path in target.iterdir()) == [
    'SHASUMS256.txt', 'node-v20.20.2-linux-x64', 'node-v20.20.2-linux-x64.tar.xz']
references = []
foreign_unreadable_maps = []
needle = str(target).encode()
for process in Path('/proc').iterdir():
    if not process.name.isdigit():
        continue
    try:
        command = process.joinpath('cmdline').read_bytes()
        try:
            mappings = process.joinpath('maps').read_bytes()
        except PermissionError:
            # Task children share our UID. Refuse missing visibility for those;
            # pre-existing foreign daemon maps are outside that assertion.
            if process.stat().st_uid == os.getuid():
                raise
            foreign_unreadable_maps.append(int(process.name))
            mappings = b''
        if needle in command or needle in mappings:
            references.append(int(process.name))
    except (FileNotFoundError, ProcessLookupError):
        continue
if references:
    raise RuntimeError('Toolchain still referenced by processes: ' + str(references))
identities = set()
allocated = 0
for path in target.rglob('*'):
    state = path.lstat()
    identity = (state.st_dev, state.st_ino)
    if identity not in identities:
        identities.add(identity)
        allocated += state.st_blocks * 512
before = shutil.disk_usage(root).free
shutil.rmtree(target)
after = shutil.disk_usage(root).free
receipt = {'removedPath': str(target), 'inactiveProcessReferences': references,
           'foreignUnreadableMaps': foreign_unreadable_maps,
           'verifiedArchiveSha256': expected['sha256'],
           'distinctFileAllocationRemoved': allocated,
           'filesystemFreeBefore': before, 'filesystemFreeAfter': after,
           'filesystemFreeDelta': after - before,
           'scope': 'Only this attempt temporary Node copy; no Rust cache or worker directory.'}
(root / 'ci-logs/issue-784-restart-2/cleanup.json').write_text(json.dumps(receipt) + '\n')
print(json.dumps(receipt))
