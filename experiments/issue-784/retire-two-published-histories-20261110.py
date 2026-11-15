"""Verify two complete published histories before retiring inactive local copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

head = 'e88183bb894b9ea62c9d6ae170c3fc099047685b'
base = Path('docs/case-studies/issue-784/evidence')
choices = [
    ('native-cli-progress-history-20261110.tar.gz', 'native-cli-progress-history-20261110.tar.receipt.json.gz'),
    ('isolated-path-reentry-20261110.tar.xz', 'isolated-path-reentry-20261110.json.gz'),
]
def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()
def identity(path):
    s = path.lstat()
    assert stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
    return [s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns]
def inactive(path):
    selected = str(path.resolve())
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal(): continue
        try:
            for fd in (process / 'fd').iterdir():
                try: assert os.readlink(fd).removesuffix(' (deleted)') != selected
                except (FileNotFoundError,ProcessLookupError,PermissionError): pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None,5)
                assert len(fields) < 6 or fields[5] != selected
        except (FileNotFoundError,ProcessLookupError,PermissionError): pass
rows = []
for name, receipt_name in choices:
    path, receipt = base / name, base / receipt_name
    encoded = receipt.read_bytes()
    prior = json.loads(gzip.decompress(encoded) if receipt.name.endswith('.gz') else encoded)
    if 'retainedPath' in prior.get('members',[{}])[0]:
        pinned = next(row for row in prior['members'] if row['retainedPath'] == str(path))
        size,sha256 = pinned['bytes'],pinned['sha256']
    else:
        assert prior['archive'] == str(path)
        size,sha256 = prior.get('archiveBytes',prior.get('bytes')),prior.get('archiveSha256',prior.get('sha256'))
    before = identity(path)
    assert path.stat().st_size == size and digest(path) == sha256
    metadata = json.loads(subprocess.check_output(['gh','api',
        'repos/link-assistant/router/contents/'+str(path)+'?ref='+head,
        '--jq','{path,size,sha,html_url,type}']))
    assert metadata['type'] == 'file' and metadata['path'] == str(path) and metadata['size'] == size
    blob = subprocess.check_output(['git','rev-parse',head+':'+str(path)],text=True).strip()
    assert blob == metadata['sha']
    child = subprocess.Popen(['git','cat-file','blob',blob],stdout=subprocess.PIPE)
    with child.stdout as source: observed = hashlib.file_digest(source,'sha256').hexdigest()
    assert child.wait() == 0 and observed == sha256
    inactive(path)
    assert identity(path) == before and digest(path) == sha256
    rows.append(dict(path=str(path),bytes=size,sha256=sha256,identity=before,
                     allocatedBytes=path.stat().st_blocks*512,metadata=metadata,gitBlob=blob,
                     originalReceipt=str(receipt),originalReceiptSha256=digest(receipt),
                     permanentUrl=metadata['html_url']+'?raw=true',
                     exactCompletePublishedGitStreamVerified=True))
record = dict(schema='two-published-history-retirement-pre-unlink-v1',
              publishedCommit=head,executedScript=__file__,executedScriptSha256=digest(Path(__file__)),
              originalStreamsRetainedWholeInPublishedGit=True,rows=rows)
target = base / 'two-published-history-retirement-pre-unlink-20261110.json.gz'
raw = json.dumps(record).encode()
with target.open('xb') as output: output.write(gzip.compress(raw,mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in rows:
    path = Path(row['path']);inactive(path)
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    path.unlink();assert not path.exists()
completion = dict(schema='two-published-history-retirement-completion-v1',
                  preUnlinkReceipt=str(target),preUnlinkReceiptSha256=digest(target),
                  postUnlinkPathsAbsent=[row['path'] for row in rows],
                  logicalBytesReclaimed=sum(row['bytes'] for row in rows),
                  allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
                  publishedCommit=head,allOriginalStreamsRetainedWhole=True,
                  fullGatePassed=False,runtimeParity=False,rustExecuted=False)
target = base / 'two-published-history-retirement-completion-20261110.json.gz'
raw = json.dumps(completion).encode()
with target.open('xb') as output: output.write(gzip.compress(raw,mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for document in Path('docs/case-studies/issue-784').glob('*.md'):
    before = document.read_text();after = before
    for row in rows:
        local = 'evidence/'+str(Path(row['path']).relative_to(base))
        after = after.replace(']('+local+')',']('+row['permanentUrl']+')')
    if before != after: document.write_text(after)
print(json.dumps(completion))
