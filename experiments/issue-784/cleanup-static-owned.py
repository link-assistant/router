"""Remove this attempt's inactive toolchain and preserved external proposal."""
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[2]
label = sys.argv[1] if len(sys.argv) > 1 else 'restart-static'
if label not in ['restart-static', 'restart-export'] or len(sys.argv) > 2:
    raise RuntimeError('Expected an identified task receipt label')
proposal = Path(json.loads((root / ('ci-logs/' + label + '-proposal.json')).read_text())['output'])
if proposal.parent != Path('/tmp') or not proposal.name.startswith('router-issue-784-static-proposal-'):
    raise RuntimeError('Unexpected proposal root')
preserved = root / ('ci-logs/' + label + '-proposal-originals')
for source in proposal.iterdir():
    target = preserved / source.name
    if source.is_symlink() or not source.is_file() or source.read_bytes() != target.read_bytes():
        raise RuntimeError('Complete proposal original was not preserved')
roots = [root / 'js/node_modules/.issue-784-tools', proposal]
active = []
for process in Path('/proc').iterdir():
    if not process.name.isdigit():
        continue
    links = [process / 'cwd', process / 'exe']
    try:
        links.extend((process / 'fd').iterdir())
    except (OSError, PermissionError):
        pass
    for link in links:
        try:
            value = os.readlink(link).removesuffix(' (deleted)')
        except OSError:
            continue
        for path in roots:
            if value == str(path) or value.startswith(str(path) + '/'):
                active.append({'pid': int(process.name), 'path': str(path)})
if active:
    raise RuntimeError('Refusing active task paths: ' + json.dumps(active))
before = shutil.disk_usage(root).free
rows, seen = [], set()
for path in roots:
    if path.is_symlink() or not path.is_dir():
        raise RuntimeError('Unexpected cleanup path')
    logical = allocated = files = 0
    for directory, _, names in os.walk(path, followlinks=False):
        for name in names:
            info = (Path(directory) / name).lstat()
            logical += info.st_size
            identity = (info.st_dev, info.st_ino)
            if identity not in seen:
                allocated += info.st_blocks * 512
                seen.add(identity)
            files += 1
    shutil.rmtree(path)
    rows.append({'path': str(path), 'files': files, 'logicalBytesRemoved': logical,
                 'distinctFileAllocationBytesRemoved': allocated})
receipt = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'removed': rows,
           'activeReferences': [], 'rustToolsExecuted': False,
           'observedFilesystemFreeDeltaBytes': shutil.disk_usage(root).free - before}
(root / ('ci-logs/' + label + '-cleanup.json')).write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
