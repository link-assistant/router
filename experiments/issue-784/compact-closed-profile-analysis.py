"""Retire one reproducible derived table; retain the complete original profile."""
from collections import defaultdict
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat

base = Path('ci-logs/issue-784-restart-2')
source = base / 'current-02bf-reverse-profile-analysis.json.gz'
original = base / 'current-02bf-reverse-fresh.cpuprofile.gz'
closed = json.loads((base / 'current-02bf-reverse-fresh-profile-resource.json').read_bytes())
assert closed['exitCode'] == 0 and not closed['stopped']
assert not Path('/proc/' + str(closed['pid'])).exists()
state = source.lstat()
assert state.st_uid == os.getuid() and state.st_nlink == 1 and stat.S_ISREG(state.st_mode)
assert state.st_size < 4 * 1024 * 1024
document = json.loads(gzip.decompress(source.read_bytes()))
summary = {key: value for key, value in document.items() if key not in ['self', 'inclusive']}
for field in ['self', 'inclusive']:
    totals = defaultdict(int)
    for row in document[field]:
        totals[(row['name'], row['url'], row['line'])] += row['microseconds']
    summary[field + 'BySourceFrame'] = [dict(name=key[0], url=key[1], line=key[2], microseconds=value)
        for key, value in sorted(totals.items(), key=lambda item: -item[1])]
summary['scope'] = 'Aggregated derived sampling table; recursive inclusive frames can be counted repeatedly. Complete raw CPU profile remains retained.'
target = base / 'current-02bf-reverse-profile-source-frames.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(summary).encode(), mtime=0))
assert json.loads(gzip.decompress(target.read_bytes())) == summary
digest = hashlib.sha256()
length = 0
with gzip.open(original, 'rb') as stream:
    while block := stream.read(65536):
        digest.update(block)
        length += len(block)
assert length == 92252267
absolute = str(source.resolve())
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for fd in (process / 'fd').iterdir():
            try:
                assert os.readlink(fd) != absolute
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
record = dict(schema='inactive-derived-profile-table-retirement-v1', retiredPath=str(source),
              retiredBytes=state.st_size, retiredSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
              retainedWholeOriginal=str(original), originalBytes=length, originalSha256=digest.hexdigest(),
              retainedAggregate=str(target), retainedAggregateBytes=target.stat().st_size,
              completeOriginalReadbackVerified=True, originalDeadlineQualified=False)
assert source.lstat() == state
receipt = base / 'current-02bf-derived-profile-retirement.json'
with receipt.open('x') as output:
    json.dump(record, output)
source.unlink()
print(json.dumps(record))
