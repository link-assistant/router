"""Retire identified inactive task archives after whole published-blob custody."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

base = Path('docs/case-studies/issue-784/evidence')
plan_path = Path('ci-logs/issue-784-restart-2/current-79f-published-retirement-plan.json')
plan = json.loads(plan_path.read_bytes())
assert plan['publishedCommit'] == '79f375ed1d9690ab8336e06a28331c2871092eb0'
assert len(plan['rows']) == 9 and plan['bytes'] == 82716465
receipt = base / 'current-79f-published-retirement-20261110.json.gz'
completion = base / 'current-79f-published-retirement-complete-20261110.json.gz'
assert not receipt.exists() and not completion.exists()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return [getattr(value, field) for field in ['st_dev', 'st_ino', 'st_mode',
            'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']]


def inactive(rows):
    paths = {str(Path(row['path']).resolve()) for row in rows}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd).removesuffix(' (deleted)') not in paths
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in paths
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


def write(path, value):
    raw = (json.dumps(value, separators=(',', ':')) + '\n').encode()
    with path.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(path.read_bytes()) == raw


rows = []
for row in plan['rows']:
    path = Path(row['path'])
    assert path.is_relative_to(base) and path.resolve() == Path.cwd() / path
    before = identity(path)
    assert before[5] == row['bytes'] and digest(path) == row['sha256']
    metadata = json.loads(subprocess.check_output([
        'gh', 'api', 'repos/link-assistant/router/contents/' + row['path'] + '?ref=' + plan['publishedCommit'],
        '--jq', '{path,size,sha,html_url,type}',
    ]))
    assert metadata == dict(path=row['path'], size=row['bytes'], sha=row['gitBlob'],
                           html_url=metadata['html_url'], type='file')
    child = subprocess.Popen(['git', 'cat-file', 'blob', row['gitBlob']], stdout=subprocess.PIPE)
    with child.stdout as source:
        published = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and published == row['sha256']
    inactive([row])
    assert identity(path) == before and digest(path) == row['sha256']
    rows.append(dict(row, identity=before, metadata=metadata,
                     allocatedBytes=path.stat().st_blocks * 512,
                     permanentUrl=metadata['html_url'] + '?raw=true',
                     exactCompletePublishedGitStreamVerified=True))
record = dict(schema='complete-current-published-archive-retirement-v1',
              publishedCommit=plan['publishedCommit'], rows=rows,
              logicalBytesReclaimed=sum(row['bytes'] for row in rows),
              allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
              onlyInactiveTaskArchives=True, originalStreamsRetainedInPublishedGit=True)
inactive(rows)
write(receipt, record)
for row in rows:
    path = Path(row['path'])
    inactive([row])
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    path.unlink()
assert all(not Path(row['path']).exists() for row in rows)
write(completion, dict(schema=record['schema'], receipt=str(receipt),
                      receiptSha256=digest(receipt), retired=len(rows),
                      logicalBytesReclaimed=record['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=record['allocatedBytesReclaimed']))
# Keep all historical report links directly usable through immutable Git URLs.
changed = []
for path in Path('docs/case-studies/issue-784').glob('*.md'):
    before = path.read_text()
    after = before
    for row in rows:
        after = after.replace('(' + str(Path(row['path']).relative_to('docs/case-studies/issue-784')) + ')', '(' + row['permanentUrl'] + ')')
    if after != before:
        path.write_text(after)
        changed.append(str(path))
print(json.dumps(dict(retired=len(rows), logicalBytesReclaimed=record['logicalBytesReclaimed'],
                      allocatedBytesReclaimed=record['allocatedBytesReclaimed'],
                      updatedReports=changed, receipt=str(receipt))))
