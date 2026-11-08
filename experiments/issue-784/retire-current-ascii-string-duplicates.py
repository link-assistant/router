"""Retire closed raw copies only after complete committed packet readback."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

root = Path.cwd()
receipt = Path('ci-logs/issue-784-restart-2/current-ascii-string-duplicate-retirement.json')
assert not receipt.exists()
selected, packets = {}, []
for label, commit in [('current-string-equality-parent', '8b6c1fa4d'),
                      ('current-ascii-receiving', 'fb709d554')]:
    path = Path('docs/case-studies/issue-784/evidence') / (label + '.json.gz')
    packed = path.read_bytes()
    assert packed == subprocess.check_output(['git', 'show', commit + ':' + str(path)])
    packets.append({'path': str(path), 'commit': commit,
                    'sha256': hashlib.sha256(packed).hexdigest()})
    for row in json.loads(gzip.decompress(packed))['members']:
        raw = base64.b64decode(row['base64'], validate=True)
        assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
        name = row['path']
        if not name.startswith(('ci-logs/issue-784-restart-2/',
                                'js/node_modules/.node-case-deadlines/')):
            continue
        assert name not in selected and Path(name).is_file()
        if name.endswith('.memory.json'):
            memory = json.loads(raw)
            assert all(not Path('/proc/' + str(pid)).exists()
                       for pid in [memory['pid'], *memory['stoppedOwnedProcessIds']])
        if name.endswith('/terminal.json'):
            terminal = json.loads(raw)
            assert terminal['childClosed'] and terminal['groupCleanup']['complete']
            assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        selected[name] = (row, raw, str(path))
assert 75 <= len(selected) <= 150

def inactive():
    absolute = {str(root / name) for name in selected}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for descriptor in (process / 'fd').iterdir():
                try:
                    assert os.readlink(descriptor) not in absolute
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in absolute
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass

def identity(state):
    return [state.st_dev, state.st_ino, state.st_mode, state.st_uid, state.st_nlink,
            state.st_size, state.st_mtime_ns, state.st_ctime_ns]

inactive()
records = []
for name, (row, raw, packet) in selected.items():
    path = Path(name)
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    assert path.read_bytes() == raw
    records.append({'path': name, 'bytes': row['bytes'], 'sha256': row['sha256'],
                    'packet': packet, 'identity': identity(state),
                    'allocatedBytes': state.st_blocks * 512})
inactive()
for record in records:
    path = Path(record['path'])
    assert identity(path.lstat()) == record['identity']
    assert path.read_bytes() == selected[record['path']][1]
result = {'schema': 'complete-closed-ascii-string-duplicate-retirement-v1',
          'packets': packets, 'records': records, 'completeOriginalsRetained': True,
          'logicalBytesReclaimed': sum(row['bytes'] for row in records),
          'allocatedBytesReclaimed': sum(row['allocatedBytes'] for row in records)}
with receipt.open('x') as output:
    json.dump(result, output)
for record in records:
    Path(record['path']).unlink()
print(json.dumps({key: value for key, value in result.items()
                  if key not in ['packets', 'records']}))
