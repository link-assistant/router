"""Retire only exact inactive raw members of three committed complete packets."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

root = Path.cwd()
receipt = Path('ci-logs/issue-784-restart-2/current-paired-project-duplicate-retirement.json')
assert not receipt.exists()
selected, archives = {}, []
for name, commit in [('current-native-cli-imports', '262a338c522bcadce2955acdc2ed93bc7e90b752'),
                     ('current-native-retention-history', 'cbe928e11'),
                     ('current-receiving-performance', 'a7bcf9526b0835f634b900e91fc30fc9c8301581')]:
    path = Path('docs/case-studies/issue-784/evidence') / (name + '.json.gz')
    packed = path.read_bytes()
    assert packed == subprocess.check_output(['git', 'show', commit + ':' + str(path)])
    archives.append({'path': str(path), 'commit': commit, 'bytes': len(packed),
                     'sha256': hashlib.sha256(packed).hexdigest()})
    seen = set()
    for member in json.loads(gzip.decompress(packed))['members']:
        if 'base64' in member:
            raw = base64.b64decode(member['base64'], validate=True)
        else:
            assert member['encoding'] == 'base64'
            raw = base64.b64decode(member['content'], validate=True)
        assert len(raw) == member['bytes'] and hashlib.sha256(raw).hexdigest() == member['sha256']
        name = member['path']
        assert name not in seen
        seen.add(name)
        if not name.startswith(('ci-logs/issue-784-restart-2/', 'js/node_modules/.node-case-deadlines/')):
            continue
        assert name not in selected
        selected[name] = (member, raw, str(path))
        if name.endswith('.memory.json'):
            check = json.loads(raw)
            assert not Path('/proc/' + str(check['pid'])).exists()
            assert all(not Path('/proc/' + str(pid)).exists() for pid in check['stoppedOwnedProcessIds'])
        if name.endswith('/terminal.json'):
            check = json.loads(raw)
            assert check['childClosed'] and check['groupCleanup']['complete']
            assert not Path('/proc/' + str(check['groupCleanup']['group'])).exists()
assert len(selected) == 221 and sum(row[0]['bytes'] for row in selected.values()) == 1686719


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
for name, (member, raw, archive) in selected.items():
    path = Path(name)
    assert path.resolve() == root / name
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    assert path.read_bytes() == raw
    rows.append({'path': name, 'archive': archive, 'bytes': len(raw), 'sha256': member['sha256'],
                 'identity': identity(state), 'allocatedBytes': state.st_blocks * 512})
record = {'schema': 'recent-complete-raw-duplicate-retirement-v1', 'archives': archives,
          'rows': rows, 'completeOriginalsRetained': True,
          'logicalBytesReclaimed': sum(row['bytes'] for row in rows),
          'allocatedBytesReclaimed': sum(row['allocatedBytes'] for row in rows),
          'filesystemFreeBeforeBytes': os.statvfs(root).f_bavail * os.statvfs(root).f_frsize}
with receipt.open('x') as output:
    json.dump(record, output)
inactive()
for archive in archives:
    assert hashlib.sha256(Path(archive['path']).read_bytes()).hexdigest() == archive['sha256']
for row in rows:
    path = Path(row['path'])
    assert identity(path.lstat()) == row['identity'] and path.read_bytes() == selected[row['path']][1]
    path.unlink()
print(json.dumps({'schema': record['schema'], 'completeRawMembersRetired': len(rows),
                  'logicalBytesReclaimed': record['logicalBytesReclaimed'],
                  'allocatedBytesReclaimed': record['allocatedBytesReclaimed'],
                  'filesystemFreeAfterBytes': os.statvfs(root).f_bavail * os.statvfs(root).f_frsize,
                  'completeOriginalsRetained': True}))
