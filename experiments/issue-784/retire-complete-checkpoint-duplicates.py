"""Retire inactive task evidence already retained in three complete packets."""
from datetime import datetime, timezone
import argparse
import hashlib
import json
import os
from pathlib import Path
import tarfile

root = Path.cwd()
base = root / 'docs/case-studies/issue-784/evidence'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--terminal-0e234', action='store_true')
args = parser.parse_args()
receipt_name = ('current-terminal-0e234-retirement.json' if args.terminal_0e234
                else 'current-complete-checkpoint-retirement.json')
receipt = root / 'ci-logs/issue-784-restart-2' / receipt_name
assert not receipt.exists()
selected, packets = {}, []
allowed = [root / 'ci-logs/issue-784-restart-2',
           root / 'js/node_modules/.node-case-deadlines']


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


names = (['ci-0e234-terminal-20261111'] if args.terminal_0e234 else
         ['current-reverse-freshness', 'struct-ordering-comparison-history',
          'native-call-arity-negative'])
for name in names:
    manifest_path = base / (name + '.receipt.json')
    manifest = json.loads(manifest_path.read_text())
    assert manifest['allDecodedOriginalsVerified']
    archive = root / manifest['archive']
    assert archive.stat().st_size == manifest['archiveBytes']
    assert digest(archive) == manifest['archiveSha256']
    expected = {row['path']: row for row in manifest['members']}
    seen, contents = set(), {}
    with tarfile.open(archive, 'r|xz') as source:
        for member in source:
            assert member.name in expected and member.name not in seen
            row = expected[member.name]
            if member.islnk():
                actual = contents[member.linkname]
            else:
                assert member.isfile()
                actual = (member.size, hashlib.file_digest(
                    source.extractfile(member), 'sha256').hexdigest())
            assert actual == (row['bytes'], row['sha256'])
            contents[member.name] = actual
            seen.add(member.name)
            path = Path(row['originalPath'])
            if (any(path.is_relative_to(parent) for parent in allowed)
                    and path.is_file() and not path.is_symlink()
                    and path.stat().st_uid == os.getuid()
                    and (path.stat().st_size, digest(path)) == actual):
                selected[str(path)] = dict(row, packet=str(manifest_path))
    assert seen == set(expected)
    packets.append(dict(path=str(archive), sha256=manifest['archiveSha256'],
                        completeMembersVerified=len(seen)))
assert 0 < len(selected) < 256


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        links = [process / 'cwd', process / 'exe']
        try:
            links.extend((process / 'fd').iterdir())
        except OSError:
            pass
        for link in links:
            try:
                target = os.readlink(link).removesuffix(' (deleted)')
            except OSError:
                continue
            assert target not in selected, 'Active evidence: ' + str(process)


inactive()
allocated = logical = 0
for name, row in selected.items():
    path = Path(name)
    assert (path.stat().st_size, digest(path)) == (row['bytes'], row['sha256'])
    logical += path.stat().st_size
    allocated += path.stat().st_blocks * 512
inactive()
for name in selected:
    Path(name).unlink()
result = dict(checkedAt=datetime.now(timezone.utc).isoformat(),
              packets=packets, removed=list(selected.values()),
              logicalBytesRemoved=logical, fileAllocationBytesRemoved=allocated,
              completeArchivedMembersVerified=True, activeReferences=[],
              originalSourcesRemoved=False, rustExecuted=False)
with receipt.open('x') as output:
    json.dump(result, output, indent=2)
print(json.dumps(dict(files=len(selected), logicalBytesRemoved=logical,
                      fileAllocationBytesRemoved=allocated, receipt=str(receipt))))
