"""Retire 35 exact inactive CI copies after complete published member readback."""
import gzip
import hashlib
import json
import os
import stat
import tarfile
from pathlib import Path

ROOT = Path.cwd()
PLAN = ROOT / 'ci-logs/issue-784-restart-2/current-ci-duplicate-retirement-plan.json'
RECEIPT = PLAN.with_name('current-ci-duplicate-retirement.json')
plan = json.loads(PLAN.read_text())
assert len(plan) == 35 and not RECEIPT.exists()
assert len({row['path'] for row in plan}) == len(plan)


def digest(stream):
    hasher = hashlib.sha256()
    size = 0
    while block := stream.read(65536):
        size += len(block)
        hasher.update(block)
    return size, hasher.hexdigest()


def identity(info):
    return (info.st_dev, info.st_ino, info.st_mode, info.st_uid,
            info.st_nlink, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


selected = {str(ROOT / row['path']) for row in plan}
assert all(Path(path).is_relative_to(ROOT / 'ci-logs') for path in selected)


def require_inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for descriptor in (process / 'fd').iterdir():
                try:
                    assert os.readlink(descriptor) not in selected
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


require_inactive()
packets = {}
rows = []
for item in plan:
    manifest = item['manifest']
    if manifest not in packets:
        packets[manifest] = json.loads(gzip.decompress(Path(manifest).read_bytes()))
    packet = packets[manifest]
    assert packet['schema'] == 'complete-evidence-packet-v1'
    matches = [row for row in packet['members'] if row['path'] == item['path']]
    assert len(matches) == 1
    member = matches[0]
    path = ROOT / item['path']
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_nlink == 1
    assert info.st_uid == os.getuid()
    with path.open('rb') as stream:
        assert digest(stream) == (member['bytes'], member['sha256'])
    rows.append({**member, 'manifest': manifest, 'identity': identity(info),
                 'allocatedBytes': info.st_blocks * 512})

for manifest, packet in packets.items():
    archive = Path(packet['archive'])
    assert archive.is_relative_to(ROOT / 'docs/case-studies/issue-784/evidence')
    assert not archive.is_symlink()
    with archive.open('rb') as stream:
        assert digest(stream) == (packet['archiveBytes'], packet['archiveSha256'])
    with tarfile.open(archive, 'r:xz') as source:
        for row in rows:
            if row['manifest'] != manifest:
                continue
            member = source.getmember(row['path'])
            assert member.isfile() or member.islnk()
            with source.extractfile(member) as stream:
                assert digest(stream) == (row['bytes'], row['sha256'])
            row['completeMemberReadbackVerified'] = True

assert all(row['completeMemberReadbackVerified'] for row in rows)
require_inactive()
for row in rows:
    path = ROOT / row['path']
    assert identity(path.lstat()) == row['identity']
    with path.open('rb') as stream:
        assert digest(stream) == (row['bytes'], row['sha256'])

record = {
    'schema': 'complete-published-ci-duplicate-retirement-v1',
    'rows': rows,
    'archives': {name: {key: packet[key] for key in
                       ('archive', 'archiveBytes', 'archiveSha256')}
                 for name, packet in packets.items()},
    'logicalBytesReclaimed': sum(row['bytes'] for row in rows),
    'allocatedBytesReclaimed': sum(row['allocatedBytes'] for row in rows),
    'completeOriginalsRetained': True,
}
with RECEIPT.open('x') as stream:
    json.dump(record, stream, indent=2)
    stream.write('\n')
for row in rows:
    path = ROOT / row['path']
    assert identity(path.lstat()) == row['identity']
    path.unlink()
print(json.dumps({key: record[key] for key in
                  ('schema', 'logicalBytesReclaimed', 'allocatedBytesReclaimed',
                   'completeOriginalsRetained')}))
