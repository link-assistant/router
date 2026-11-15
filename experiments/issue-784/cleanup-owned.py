"""Remove only identified task-owned inactive temporary paths after verification."""
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

roots = [Path('/tmp/router-issue-784-node'),
         Path('/tmp/router-serde-alias-default-5Mo1B7'),
         Path('/tmp/router-native-core-ytYjms')]
active = []
for process in Path('/proc').iterdir():
    if not process.name.isdigit():
        continue
    links = [process / 'cwd', process / 'exe']
    try:
        links.extend((process / 'fd').iterdir())
    except (FileNotFoundError, PermissionError):
        pass
    for link in links:
        try:
            target = os.readlink(link).removesuffix(' (deleted)')
        except (FileNotFoundError, PermissionError, OSError):
            continue
        for root in roots:
            if target == str(root) or target.startswith(str(root) + '/'):
                active.append({'pid': int(process.name), 'root': str(root)})
if active:
    raise RuntimeError('Refusing active task paths: ' + json.dumps(active))
rows = []
before = shutil.disk_usage('/tmp').free
seen = set()
for root in roots:
    if not root.exists():
        continue
    if root.is_symlink() or not root.is_dir():
        raise RuntimeError('Refusing unexpected task path: ' + str(root))
    logical = allocated = files = 0
    for directory, _, names in os.walk(root, followlinks=False):
        for name in names:
            info = (Path(directory) / name).lstat()
            logical += info.st_size
            identity = (info.st_dev, info.st_ino)
            if identity not in seen:
                allocated += info.st_blocks * 512
                seen.add(identity)
            files += 1
    shutil.rmtree(root)
    rows.append({'path': str(root), 'files': files, 'logicalBytesRemoved': logical,
                 'fileAllocationBytesRemoved': allocated})
for name in ['verify-final', 'verify-historical', 'prepare-evidence']:
    for path in Path('experiments/issue-784/__pycache__').glob(name + '.*.pyc'):
        path.unlink()
cache = Path('experiments/issue-784/__pycache__')
if cache.is_dir() and not any(cache.iterdir()):
    cache.rmdir()
receipt = {'checkedAt': datetime.now(timezone.utc).isoformat(),
           'activeReferences': [], 'removed': rows,
           'rustBuildCachesCreated': False,
           'observedFilesystemFreeDeltaBytes': shutil.disk_usage('/tmp').free - before,
           'totalFileAllocationBytesRemoved': sum(row['fileAllocationBytesRemoved'] for row in rows)}
Path('docs/case-studies/issue-784/raw/cleanup.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
