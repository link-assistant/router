"""Retire only five reviewed, inactive archives preserved in published Git."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

HEAD = 'e88183bb894b9ea62c9d6ae170c3fc099047685b'
BASE = Path('docs/case-studies/issue-784/evidence')
CHOICES = [
    ('core-hook-receiving-20261110', 9192435, '3d52ba893e6a66592b813035b67ecee7ea6e6d1874382b7659003c0e4884000f', 131),
    ('core-registration-receiving-20261110', 7567424, '93b285cf13fbb3ef2b0ea3f75c77025856ea170f94b2a7eb8a26b6c447542be4', 104),
    ('proof-history-receiving-20261110', 5992878, '9e2a9b5b666ba853b0487bfd7bf12225793e617cabd6ecd7013b691b0e7d7e89', 61),
    ('namespace-receiving-20261110', 5134701, '4903c2e37e2d96644f0fe7132006dd2716c2c291942d770c6b9bc0a189ea9beb', 119),
    ('current-679-ci-terminal-ci', 7829294, 'cc9ed055aea0850f8b59334662c94502d4d821452f50604293d798c5ec4cbe59', 100),
]


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    return [getattr(state, key) for key in ['st_dev', 'st_ino', 'st_mode', 'st_uid',
            'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']]


def inactive(path):
    selected = str(path.resolve())
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd).removesuffix(' (deleted)') != selected
                except (FileNotFoundError, ProcessLookupError, PermissionError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] != selected
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


rows = []
for stem, size, sha256, count in CHOICES:
    path = BASE / (stem + '.tar.gz')
    receipt = path.with_suffix('.receipt.json.gz')
    original = json.loads(gzip.decompress(receipt.read_bytes()))
    assert original.get('archive', original.get('path')) == str(path)
    assert original['bytes'] == size and original['sha256'] == sha256
    assert len(original['members']) == count
    before = identity(path)
    assert path.stat().st_size == size and digest(path) == sha256
    metadata = json.loads(subprocess.check_output([
        'gh', 'api', 'repos/link-assistant/router/contents/' + str(path) + '?ref=' + HEAD,
        '--jq', '{path,size,sha,html_url,type}',
    ]))
    assert metadata['type'] == 'file' and metadata['path'] == str(path) and metadata['size'] == size
    blob = subprocess.check_output(['git', 'rev-parse', HEAD + ':' + str(path)], text=True).strip()
    assert blob == metadata['sha']
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        retained = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and retained == sha256
    inactive(path)
    assert identity(path) == before and digest(path) == sha256
    rows.append(dict(path=str(path), bytes=size, sha256=sha256, originalMembers=count,
                     identity=before, metadata=metadata, publishedCommit=HEAD, gitBlob=blob,
                     originalReceipt=str(receipt), originalReceiptSha256=digest(receipt),
                     permanentUrl=metadata['html_url'] + '?raw=true',
                     exactCompletePublishedGitStreamVerified=True,
                     localArchiveRetired=False))

for row in rows:
    path = Path(row['path'])
    inactive(path)
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    target = path.with_name(path.name.removesuffix('.tar.gz') + '-local-retirement.json.gz')
    record = dict(schema='complete-published-receiving-archive-local-retirement-v1',
                  **row, logicalBytesReclaimed=row['bytes'], allocatedBytesReclaimed=path.stat().st_blocks * 512,
                  scope='One identified inactive task archive. Exact full original compressed bytes remain in published Git history.',
                  sourceAuthority=False, runtimeParity=False, rustExecuted=False)
    raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
    with target.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(target.read_bytes()) == raw
    inactive(path)
    assert identity(path) == row['identity']
    path.unlink()
    print(json.dumps(dict(path=str(path), retiredBytes=row['bytes'], permanentUrl=row['permanentUrl'],
                          fullPublishedOriginalVerified=True, receipt=str(target))), flush=True)
print(json.dumps(dict(logicalBytesReclaimed=sum(row['bytes'] for row in rows), archives=len(rows))))
