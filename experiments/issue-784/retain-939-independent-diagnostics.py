"""Retain complete finite diagnostics without qualifying a production deadline."""
import gzip
import hashlib
import json
from pathlib import Path
import tarfile

base = Path('ci-logs/issue-784-restart-2')
paths = {
    base / 'current-native-profile-analysis.json.gz',
    base / 'current-native-profile-analysis.log',
    base / 'current-native-erasure-program-1-source.mjs',
    base / 'current-native-erasure-program-2.json.gz',
    Path('experiments/issue-784/analyze-current-native-profiles.py'),
    Path('experiments/issue-784/probe-native-erasure-program.mjs'),
}
resources = []
for attempt in [1, 2]:
    prefix = base / ('current-native-erasure-program-' + str(attempt))
    for suffix in ['.log', '.memory.json', '.observer.log']:
        paths.add(Path(str(prefix) + suffix))
    row = json.loads(Path(str(prefix) + '.memory.json').read_bytes())
    assert not row['stopped'] and not Path('/proc/' + str(row['pid'])).exists()
    assert row['exitCode'] == (1 if attempt == 1 else 0)
    resources.append(row)

with gzip.open(base / 'current-native-erasure-program-2.json.gz', 'rb') as source:
    decoded = source.read(32 * 1024**2 + 1)
    assert len(decoded) <= 32 * 1024**2 and not source.read(1)
measurement = json.loads(decoded)
assert measurement['compiler'] == '5.9.3'
assert measurement['diagnosticOnly'] and not measurement['originalDeadlineQualified']
assert len(measurement['sources']) == 60 and len(measurement['observations']) == 4
assert [row['name'] for row in measurement['observations']] == [
    'separate', 'grouped', 'grouped', 'separate']
baseline = measurement['observations'][0]['rows']
assert all(row['rows'] == baseline for row in measurement['observations'])

members = []
for path in sorted(paths):
    state = path.lstat()
    assert path.is_file() and not path.is_symlink() and state.st_size < 32 * 1024**2
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
target = Path('docs/case-studies/issue-784/evidence/native-erasure-diagnostics-939.tar.gz')
assert not target.exists()
allocated = sum(path.stat().st_size for root in ['ci-logs',
    'docs/case-studies/issue-784', 'experiments/issue-784',
    'js/node_modules/.node-case-deadlines'] for path in Path(root).rglob('*')
    if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert allocated + sum(row['bytes'] for row in members) + 1048576 < 500_000_000
with tarfile.open(target, 'x:gz') as output:
    for row in members:
        output.add(row['path'], arcname=row['path'], recursive=False)
expected = {row['path']: row for row in members}
seen = set()
with tarfile.open(target, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
record = dict(schema='complete-native-erasure-diagnostics-v1', archive=str(target),
    bytes=target.stat().st_size, sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
    members=members, resources=resources, compiler='5.9.3', sources=60,
    observations=[dict(name=row['name'], elapsedMs=row['elapsedMs'])
                  for row in measurement['observations']],
    allWholeEmissionsEqual=True, originalDeadlineQualified=False,
    productionImplementationChanged=False, productionExecutableGain=0,
    fullGatePassed=False, runtimeParity=False, rustExecuted=False)
receipt = target.with_name('native-erasure-diagnostics-939.json.gz')
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(target), bytes=record['bytes'], members=len(seen),
                      sha256=record['sha256'], originalDeadlineQualified=False)))
