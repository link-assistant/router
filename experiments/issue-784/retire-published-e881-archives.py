"""Retire only fully read-back, published, inactive e881 ZIP working copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

head = '9b6c9192c70f1f9309eac0c516b59102ce080409'
base = Path('docs/case-studies/issue-784/evidence/checkpoint-e881-terminal')
original = base / 'custody.json.gz'
custody = json.loads(gzip.decompress(original.read_bytes()))
expected = {row['path']: row for row in custody['members']}
tree = subprocess.check_output(['git', 'rev-parse', head + ':' + str(base)], text=True).strip()
metadata = json.loads(subprocess.check_output(['gh', 'api',
    'repos/link-assistant/router/git/trees/' + tree]))
assert metadata['sha'] == tree and metadata['truncated'] is False
remote = {row['path']: row for row in metadata['tree']}
paths = sorted(p for p in base.iterdir() if p.name.endswith(('.zip', '.zip.gz')))
assert len(paths) == 26


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return [s.st_dev, s.st_ino, s.st_mode, s.st_uid, s.st_nlink,
            s.st_size, s.st_mtime_ns, s.st_ctime_ns]


def inactive():
    selected = {str(p.resolve()) for p in paths}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd).removesuffix(' (deleted)') not in selected
                except (FileNotFoundError, ProcessLookupError, PermissionError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in selected
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


rows = []
for path in paths:
    old, published = expected[str(path)], remote[path.name]
    before = identity(path)
    assert before[5] == old['bytes'] == published['size']
    assert digest(path) == old['sha256'] and published['type'] == 'blob'
    blob = subprocess.check_output(['git', 'rev-parse', head + ':' + str(path)], text=True).strip()
    assert blob == published['sha']
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        observed = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and observed == old['sha256']
    rows.append(dict(path=str(path), bytes=old['bytes'], sha256=observed,
                     gitBlob=blob, identity=before, allocatedBytes=path.stat().st_blocks * 512,
                     permanentUrl='https://github.com/link-assistant/router/blob/' + head + '/' + str(path) + '?raw=true'))
inactive()
for row in rows:
    assert identity(Path(row['path'])) == row['identity']
record = dict(schema='published-e881-archives-pre-unlink-v1', publishedCommit=head,
              originalCustody=str(original), originalCustodySha256=digest(original),
              script=__file__, scriptSha256=digest(Path(__file__)),
              completeRemoteTree=metadata, rows=rows,
              completePublishedBlobStreamsVerified=True)
receipt = base / 'published-archive-retirement.json.gz'
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive()
for row in rows:
    path = Path(row['path'])
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    path.unlink()
completion = dict(schema='published-e881-archives-retirement-complete-v1',
                  publishedCommit=head, preUnlinkReceipt=str(receipt),
                  preUnlinkReceiptSha256=digest(receipt),
                  logicalBytesReclaimed=sum(row['bytes'] for row in rows),
                  allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
                  all26LocalPathsAbsent=all(not p.exists() for p in paths),
                  originalZipStreamsRetainedWholeInPublishedGit=True,
                  originalAvailableJobLogsRemainLocal=True, fullGatePassed=False)
assert completion['all26LocalPathsAbsent']
with (base / 'published-archive-retirement-complete.json.gz').open('xb') as target:
    target.write(gzip.compress(json.dumps(completion).encode(), mtime=0))
print(json.dumps(completion))
