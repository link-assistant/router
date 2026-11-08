"""Read the finite CPU profile and compress its complete inactive original."""
from collections import defaultdict
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat

source = Path('experiments/issue-784/current-runtime-index-384.cpuprofile')
target = source.with_suffix('.cpuprofile.gz')
state = source.lstat()
assert state.st_uid == os.getuid() and state.st_nlink == 1 and stat.S_ISREG(state.st_mode)
assert state.st_size < 32 * 1024 * 1024
with source.open('rb') as stream:
    profile = json.load(stream)
nodes = {row['id']: row for row in profile['nodes']}
parents = {}
for row in nodes.values():
    for child in row.get('children', []):
        assert child in nodes and child not in parents
        parents[child] = row['id']
assert len(profile['samples']) == len(profile['timeDeltas'])


def key(identity):
    frame = nodes[identity]['callFrame']
    return (frame['functionName'], frame['url'], frame['lineNumber'] + 1)


own = {}
for identity in nodes:
    current, seen = identity, set()
    while True:
        assert current not in seen and len(seen) < 10000
        seen.add(current)
        name, url, line = key(current)
        if '/tools/translation/' in url or '/experiments/issue-784/' in url:
            own[identity] = (name, url, line)
            break
        if current not in parents:
            own[identity] = ('outside-task-source', '', 0)
            break
        current = parents[current]
self_us, nearest_source_us = defaultdict(int), defaultdict(int)
for identity, delta in zip(profile['samples'], profile['timeDeltas']):
    self_us[key(identity)] += delta
    nearest_source_us[own[identity]] += delta


def rows(values):
    return [dict(function=name, url=url, line=line, microseconds=value)
            for (name, url, line), value in sorted(values.items(), key=lambda row: -row[1])]


with target.open('xb') as output, source.open('rb') as stream:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as packed:
        while block := stream.read(65536):
            packed.write(block)
with source.open('rb') as stream:
    digest = hashlib.file_digest(stream, 'sha256').hexdigest()
with gzip.open(target, 'rb') as stream:
    actual, length = hashlib.sha256(), 0
    while block := stream.read(65536):
        length += len(block)
        actual.update(block)
assert length == state.st_size and actual.hexdigest() == digest
record = dict(schema='whole-runtime-cpu-profile-review-v1', originalPath=str(source),
              originalBytes=length, originalSha256=digest, compressedPath=str(target),
              compressedBytes=target.stat().st_size, nodes=len(nodes),
              samples=len(profile['samples']), self=rows(self_us),
              nearestTaskSourceCaller=rows(nearest_source_us),
              wholeOriginalReadbackVerified=True, originalDeadlineQualified=False,
              scope='Sampling includes profiler/GC overhead; source attribution is the nearest task frame, not a measured production speedup.')
receipt = Path('ci-logs/issue-784-restart-2/current-runtime-index-cpu-profile-review.json.gz')
with receipt.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
assert json.loads(gzip.decompress(receipt.read_bytes())) == record
absolute = str(source.resolve())
for entry in Path('/proc').iterdir():
    if not entry.name.isdecimal():
        continue
    try:
        for fd in (entry / 'fd').iterdir():
            try:
                assert os.readlink(fd) != absolute
            except (FileNotFoundError, ProcessLookupError):
                pass
        for line in (entry / 'maps').read_text().splitlines():
            fields = line.split(None, 5)
            assert len(fields) < 6 or fields[5] != absolute
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
current = source.lstat()
for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
    assert getattr(current, field) == getattr(state, field)
source.unlink()
print(json.dumps({name: value for name, value in record.items() if name not in ['self', 'nearestTaskSourceCaller']}))
print(json.dumps(dict(topSelf=record['self'][:16], topTaskCallers=record['nearestTaskSourceCaller'][:16])))
