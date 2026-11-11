"""Keep full evidence in immutable history; retire its inactive checkout copy."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

commit = 'df6e63a2b667efb31629b746e43e93daddba0e8b'
archive = Path('docs/case-studies/issue-784/evidence/current-struct-ordering.tar.gz')
receipt = archive.with_name('current-struct-ordering-checkout-retirement.json.gz')
assert not receipt.exists()
prior = json.loads(gzip.decompress(archive.with_name('current-struct-ordering.json.gz').read_bytes()))
assert prior['sha256'] == 'c856727f5e62a59995649a9cef42d2225758a14e4ffa845344405dccf1f9ccd0'
assert subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip() == 'issue-784-1f6838f56841'
subprocess.run(['git', 'merge-base', '--is-ancestor', commit, 'HEAD'], check=True)
blob = subprocess.check_output(['git', 'rev-parse', commit + ':' + str(archive)], text=True).strip()
child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
assert hashlib.file_digest(child.stdout, 'sha256').hexdigest() == prior['sha256']
child.stdout.close()
assert child.wait() == 0
state = archive.lstat()
assert stat.S_ISREG(state.st_mode) and state.st_nlink == 1 and state.st_uid == os.getuid()
identity = [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]
assert state.st_size == prior['bytes'] == 22245944
expected = {row['path']: row for row in prior['members']}
seen = set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        assert member.size == expected[member.name]['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == expected[member.name]['sha256']
        seen.add(member.name)
assert seen == set(expected) and len(seen) == 147


def inactive():
    current = archive.lstat()
    assert [current.st_dev, current.st_ino, current.st_size, current.st_mtime_ns, current.st_ctime_ns] == identity
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
            maps = (process / 'maps').read_text(errors='replace')
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                descriptor_state = descriptor.stat()
                assert [descriptor_state.st_dev, descriptor_state.st_ino] != identity[:2]
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
        for line in maps.splitlines():
            fields = line.split(None, 5)
            assert len(fields) < 6 or fields[5].removesuffix(' (deleted)') != str(archive.resolve())
    with archive.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == prior['sha256']


inactive()
record = dict(schema='immutable-git-evidence-checkout-retirement-v1', archive=str(archive),
              commit=commit, gitBlob=blob, sha256=prior['sha256'], identity=identity,
              permanentUrl='https://github.com/link-assistant/router/blob/' + commit + '/' + str(archive),
              completeGitBlobReadBack=True, completeMembersReadBack=147,
              onlyInactiveTaskCheckoutCopy=True, logicalBytesReclaimed=state.st_size,
              allocatedBytesReclaimed=state.st_blocks * 512, historyPreserved=True,
              semanticAuthority=False, runtimeParity=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive()
subprocess.run(['git', 'rm', '--', str(archive)], check=True)
print(json.dumps(record))
