"""Retire exact inactive task copies after complete immutable custody readback."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile

published = '82bff66b3eaec603e296f1d888fe909dad4743c8'
base = Path('ci-logs/issue-784-restart-2')
evidence = Path('docs/case-studies/issue-784/evidence')
receipt = evidence / 'closed-abba-and-published-9b6-retirement.json.gz'
completion = evidence / 'closed-abba-and-published-9b6-retirement-complete.json.gz'
assert not receipt.exists() and not completion.exists()
assert subprocess.check_output(['git','ls-remote','origin','refs/heads/issue-784-1f6838f56841'],text=True).split()[0] == published


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source,'sha256').hexdigest()


def identity(path):
    info = path.lstat()
    assert stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    return [getattr(info,key) for key in ['st_dev','st_ino','st_mode','st_uid','st_nlink','st_size','st_mtime_ns','st_ctime_ns']]


def git_readback(path,commit,expected):
    blob = subprocess.check_output(['git','rev-parse',commit+':'+str(path)],text=True).strip()
    process = subprocess.Popen(['git','cat-file','blob',blob],stdout=subprocess.PIPE)
    actual = hashlib.file_digest(process.stdout,'sha256').hexdigest()
    process.stdout.close()
    assert process.wait() == 0 and actual == expected
    return blob


def inactive(rows):
    selected = {str(Path(row['path']).resolve()) for row in rows}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process/'fd').iterdir())
            maps = (process/'maps').read_text(errors='replace')
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except OSError:
                pass
        for line in maps.splitlines():
            fields = line.split(None,5)
            assert len(fields)<6 or fields[5].removesuffix(' (deleted)') not in selected


rows,archives,retainedChangedLogs = [],[],[]
for label,commit in [('completed-derive-data','241d34420'),('requested-module-data','12cb8fc07')]:
    custody_path = evidence/(label+'-negative.json.gz')
    custody = json.loads(gzip.decompress(custody_path.read_bytes()))
    archive = Path(custody['archive'])
    assert custody['allMembersFullyReadbackVerified'] and digest(archive) == custody['archiveSha256']
    blob = git_readback(archive,commit,custody['archiveSha256'])
    expected = {row['path']:row for row in custody['members']}
    seen = set()
    with tarfile.open(archive,'r|gz') as packed:
        for member in packed:
            row = expected[member.name]
            assert member.isfile() and member.name not in seen and member.size == row['bytes']
            assert hashlib.file_digest(packed.extractfile(member),'sha256').hexdigest() == row['sha256']
            seen.add(member.name)
            path = Path(member.name)
            if path.parent != base or not path.name.startswith(label+'-'):
                continue
            before = identity(path)
            if path.name == label+'-retention.log':
                # Archive writers captured their still-empty own stdout. Keep
                # the completed log and retain that difference explicitly.
                assert row['bytes'] == 0 and row['sha256'] == hashlib.sha256(b'').hexdigest()
                raw = path.read_bytes()
                retainedChangedLogs.append(dict(path=str(path),archivedState=row,
                    currentBytes=len(raw),currentSha256=hashlib.sha256(raw).hexdigest(),
                    completeCurrentSource=raw.decode(),retired=False))
                continue
            assert digest(path) == row['sha256'] and path.stat().st_size == row['bytes']
            rows.append(dict(row,identity=before,allocatedBytes=path.stat().st_blocks*512,
                             completeArchive=str(archive),archiveCommit=commit))
    assert seen == set(expected)
    archives.append(dict(path=str(archive),sha256=custody['archiveSha256'],gitBlob=blob,
                         commit=commit,allMembersFullyReadbackVerified=True))

metadata = json.loads((base/'next-82b-published-9b6-metadata.json').read_bytes())
metadata = [row for row in metadata if row['path'].endswith('.zip')]
assert len(metadata) == 21 and sum(row['size'] for row in metadata) == 19392356
metadata.append(json.loads((base/'next-82b-published-watch-metadata.json').read_bytes()))
for item in metadata:
    path = Path(item['path'])
    assert path.parent == evidence/'current-9b6-repair-batch' or path == evidence/'ci-939/checkpoint939-complete-watch.log'
    before = identity(path)
    assert item['type'] == 'file' and path.stat().st_size == item['size']
    expected = digest(path)
    blob = git_readback(path,published,expected)
    assert blob == item['sha'] and identity(path) == before
    rows.append(dict(path=str(path),bytes=path.stat().st_size,sha256=expected,
                     identity=before,allocatedBytes=path.stat().st_blocks*512,
                     metadata=item,gitBlob=blob,publishedCommit=published,
                     permanentUrl='https://github.com/link-assistant/router/blob/'+published+'/'+str(path)+'?raw=true'))
assert len({row['path'] for row in rows}) == len(rows)
inactive(rows)
record = dict(schema='closed-abba-and-published-9b6-retirement-v1',rows=rows,archives=archives,
              retainedChangedLogs=retainedChangedLogs,
              initialDraftRefusedBeforeMutation='Completed archive-writer stdout differs from its archived empty state; both completed logs remain retained.',
              logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              completeOriginalStreamsRetained=True,onlyInactiveTaskCopies=True,
              runtimeParity=False,fullGatePassed=False)


def write(path,value):
    raw = json.dumps(value,separators=(',',':')).encode()
    with path.open('xb') as output:
        output.write(gzip.compress(raw,mtime=0))
    assert gzip.decompress(path.read_bytes()) == raw


write(receipt,record)
inactive(rows)
for row in rows:
    path = Path(row['path'])
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    path.unlink()
assert all(not Path(row['path']).exists() for row in rows)
write(completion,dict(receipt=str(receipt),receiptSha256=digest(receipt),retired=len(rows),
                      logicalBytesReclaimed=record['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=record['allocatedBytesReclaimed']))
print(json.dumps(dict(retired=len(rows),logicalBytesReclaimed=record['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=record['allocatedBytesReclaimed'],receipt=str(receipt))))
