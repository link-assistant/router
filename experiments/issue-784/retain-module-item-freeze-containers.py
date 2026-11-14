"""Move exact closed task containers into permanent evidence without copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/module-item-freeze')
target.mkdir()
names = ['current-module-freeze-profile-before', 'current-module-freeze-profile-after-v2',
         'current-module-freeze-source-proposal', 'current-module-freeze-source-proposal-v2']
paths = [base / (name + '.json.gz') for name in names]
absolute = {str(path.resolve()) for path in paths}
for process in Path('/proc').iterdir():
    if process.name.isdecimal():
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd) not in absolute
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
rows = []
for path in paths:
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    before = path.read_bytes()
    decoded = gzip.decompress(before)
    json.loads(decoded)
    dest = target / path.name
    assert not dest.exists()
    path.rename(dest)
    assert dest.read_bytes() == before and gzip.decompress(dest.read_bytes()) == decoded
    rows.append({'original': str(path), 'preserved': str(dest), 'bytes': len(before),
                 'sha256': hashlib.sha256(before).hexdigest(), 'decodedBytes': len(decoded),
                 'decodedSha256': hashlib.sha256(decoded).hexdigest(),
                 'completeReadbackVerified': True})
with (base / 'current-module-freeze-container-retention.json').open('x') as output:
    json.dump({'rows': rows, 'allCompleteOriginalsRetained': True, 'method': 'same-filesystem rename after inactivity checks; no duplicate bytes'}, output)
print(json.dumps({'completeContainers': len(rows), 'preservedBytes': sum(row['bytes'] for row in rows)}))
