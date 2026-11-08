"""Retire explicit inactive CI copies after complete published member readback."""
import argparse
import gzip
import hashlib
import json
import os
import stat
import subprocess
import tarfile
from pathlib import Path

ROOT = Path.cwd()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--plan', default='current-ci-duplicate-retirement-plan.json')
parser.add_argument('--receipt', default='current-ci-duplicate-retirement.json')
parser.add_argument('--count', type=int, default=35)
parser.add_argument('--published-head', default='17c7dd9942814f2a6a17eee135016e5941f04f15')
args = parser.parse_args()
assert 1 <= args.count <= 2048
assert len(args.published_head) == 40 and all(c in '0123456789abcdef' for c in args.published_head)
assert all(Path(name).name == name and name.endswith('.json') for name in [args.plan, args.receipt])
PLAN = ROOT / 'ci-logs/issue-784-restart-2' / args.plan
RECEIPT = PLAN.with_name(args.receipt)
plan = json.loads(PLAN.read_text())
assert len(plan) == args.count and not RECEIPT.exists()
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
    for preserved in [ROOT / manifest, archive]:
        relative = str(preserved.relative_to(ROOT))
        published = subprocess.check_output(['git', 'rev-parse', args.published_head + ':' + relative]).strip()
        actual = subprocess.check_output(['git', 'hash-object', str(preserved)]).strip()
        assert actual == published
    with archive.open('rb') as stream:
        assert digest(stream) == (packet['archiveBytes'], packet['archiveSha256'])
    wanted = {row['path']: row for row in rows if row['manifest'] == manifest}
    originals, verified = {}, set()
    with tarfile.open(archive, 'r|xz') as source:
        for member in source:
            actual = None
            if member.isfile():
                with source.extractfile(member) as stream:
                    actual = digest(stream)
            elif member.islnk():
                assert member.linkname in originals
                actual = originals[member.linkname]
            if actual is not None:
                originals[member.name] = actual
            if member.name in wanted:
                row = wanted[member.name]
                assert member.name not in verified and actual == (row['bytes'], row['sha256'])
                row['completeMemberReadbackVerified'] = True
                verified.add(member.name)
    assert verified == set(wanted)
    print(json.dumps({'completeArchive': str(archive.relative_to(ROOT)),
                      'verifiedRetirementMembers': len(verified)}), flush=True)

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
    'publishedHead': args.published_head,
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
