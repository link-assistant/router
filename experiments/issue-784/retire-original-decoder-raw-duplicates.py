"""Retire closed raw duplicates whose complete bytes remain in the committed packet."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

root = Path.cwd()
archive = Path('docs/case-studies/issue-784/evidence/current-original-decoder.json.gz')
receipt = Path('ci-logs/issue-784-restart-2/current-original-decoder-duplicate-retirement.json')
assert not receipt.exists()
packed = archive.read_bytes()
assert hashlib.sha256(packed).hexdigest() == 'c7b4cd5cb05f07b843ebaea270de30ea4dbc8c57b398a7fc49e2eceb6ae4e2f0'
assert packed == subprocess.check_output(['git', 'show', 'b08f1b448:' + str(archive)])
packet = json.loads(gzip.decompress(packed))
assert packet['schema'] == 'complete-original-decoder-evidence-v1'
members = {}
for member in packet['members']:
    raw = base64.b64decode(member['base64'], validate=True)
    assert len(raw) == member['bytes']
    assert hashlib.sha256(raw).hexdigest() == member['sha256']
    assert member['path'] not in members
    members[member['path']] = (member, raw)
selected = {path: pair for path, pair in members.items() if path.startswith((
    'ci-logs/issue-784-restart-2/', 'js/node_modules/.node-case-deadlines/'))}
assert len(selected) == 58 and sum(pair[0]['bytes'] for pair in selected.values()) == 1003626
for path, (member, raw) in selected.items():
    if path.endswith('.memory.json'):
        check = json.loads(raw)
        assert not Path('/proc/' + str(check['pid'])).exists()
        assert all(not Path('/proc/' + str(pid)).exists() for pid in check['stoppedOwnedProcessIds'])
    if path.endswith('/terminal.json'):
        check = json.loads(raw)
        assert check['childClosed'] and check['groupCleanup']['complete']
        assert not Path('/proc/' + str(check['groupCleanup']['group'])).exists()


def identity(state):
    return [state.st_dev, state.st_ino, state.st_mode, state.st_uid, state.st_nlink,
            state.st_size, state.st_mtime_ns, state.st_ctime_ns]


def inactive():
    absolute = {str(root / path) for path in selected}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd) not in absolute
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in absolute
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


inactive()
rows = []
for path, (member, raw) in selected.items():
    target = Path(path)
    assert target.resolve() == root / path
    state = target.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    assert target.read_bytes() == raw
    rows.append({'path': path, 'packetMember': path, 'bytes': member['bytes'],
                 'sha256': member['sha256'], 'identity': identity(state),
                 'allocatedBytes': state.st_blocks * 512, 'completeReadbackVerified': True})
record = {'schema': 'original-decoder-raw-duplicate-retirement-v1', 'archive': str(archive),
          'archiveBytes': len(packed), 'archiveSha256': hashlib.sha256(packed).hexdigest(),
          'committedAt': 'b08f1b448', 'rows': rows, 'completeOriginalsRetained': True,
          'logicalBytesReclaimed': sum(row['bytes'] for row in rows),
          'allocatedBytesReclaimed': sum(row['allocatedBytes'] for row in rows),
          'filesystemFreeBeforeBytes': os.statvfs(root).f_bavail * os.statvfs(root).f_frsize}
with receipt.open('x') as output:
    json.dump(record, output)
inactive()
assert archive.read_bytes() == packed
for row in rows:
    target = Path(row['path'])
    assert identity(target.lstat()) == row['identity']
    assert target.read_bytes() == selected[row['path']][1]
    target.unlink()
result = {key: record[key] for key in ['schema', 'archive', 'logicalBytesReclaimed',
                                      'allocatedBytesReclaimed', 'completeOriginalsRetained']}
result['filesystemFreeAfterBytes'] = os.statvfs(root).f_bavail * os.statvfs(root).f_frsize
print(json.dumps(result))
