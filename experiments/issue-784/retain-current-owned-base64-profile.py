"""Preserve complete finite source-path CPU evidence without claiming a test pass."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
label = 'current-owned-base64-profile-valid-input'
profile = json.loads(gzip.decompress((base / (label + '-cpu.json.gz')).read_bytes()))
result = json.loads(gzip.decompress((base / (label + '-result.json.gz')).read_bytes()))
assert result['deadlineQualified'] is False and result['runtimeParity'] is False
assert len(result['result']['program']) == 14
assert all(Path(row['path']).read_text() == row['source'] for row in result['sources'])
nodes = {row['id']: row for row in profile['nodes']}
parents = {}
for row in profile['nodes']:
    for child in row.get('children', []):
        assert child not in parents
        parents[child] = row['id']
inclusive, own = {}, {}
assert len(profile['samples']) == len(profile['timeDeltas'])
for node, duration in zip(profile['samples'], profile['timeDeltas']):
    own[node] = own.get(node, 0) + duration
    seen = set()
    while node is not None:
        assert node not in seen and len(seen) < 4096
        seen.add(node)
        inclusive[node] = inclusive.get(node, 0) + duration
        node = parents.get(node)
summary = dict(sampledMicroseconds=sum(profile['timeDeltas']),
               inclusiveTimingsOverlap=True,
               nodes=[dict(frame=nodes[key]['callFrame'], inclusiveMicroseconds=value,
                           selfMicroseconds=own.get(key, 0))
                      for key, value in sorted(inclusive.items(), key=lambda row: -row[1])],
               stages=result['stages'], deadlineQualified=False,
               productionExecutableGainClaimed=0)
summary_path = base / (label + '-summary.json.gz')
assert not summary_path.exists()
summary_path.write_bytes(gzip.compress(json.dumps(summary).encode(), mtime=0))
paths = set(base.glob('current-owned-base64-profile-*.log'))
paths.update(base.glob('current-owned-base64-profile-*.memory.json'))
paths.update(base.glob(label + '-*.json.gz'))
paths.update(Path(row['path']) for row in result['sources'])
paths.add(Path(__file__).relative_to(Path.cwd()))
paths = sorted(paths)
assert sum(p.stat().st_size for p in paths) < 8_000_000


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path)) for path in paths]
resources = {name: json.loads((base / ('current-owned-base64-profile-' + name + '.memory.json')).read_bytes())
             for name in ['before', 'valid-input']}
assert resources['before']['exitCode'] == 1 and resources['valid-input']['exitCode'] == 0
assert all(not row['stopped'] and not Path('/proc', str(row['pid'])).exists()
           for row in resources.values())
archive = Path('docs/case-studies/issue-784/evidence/current-owned-base64-source-profile.tar.gz')
receipt = archive.with_name('current-owned-base64-source-profile.json.gz')
assert not archive.exists() and not receipt.exists()
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
seen, expected = set(), {row['path']: row for row in rows}
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
assert all(path.stat().st_size == row['bytes'] and digest(path) == row['sha256']
           for path, row in zip(paths, rows))
record = dict(schema='current-owned-base64-source-cpu-evidence-v1',
              parentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, resources=resources, summary=summary,
              wholeTestFileExecuted=False, fullGatePassed=False, runtimeParity=False,
              productionExecutableGainClaimed=0, rustExecuted=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['archive', 'bytes', 'sha256', 'parentHead']}))
print(json.dumps(dict(completeMembers=len(rows), sampleMicroseconds=summary['sampledMicroseconds'],
                     sourcePathOnly=True, wholeTestFileQualified=False)))
