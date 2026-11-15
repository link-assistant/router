"""Retain a complete finite runtime-scope comparison, including its negative result."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
labels = ['current-owned-base64-profile-valid-input',
          'current-owned-base64-runtime-scope']
results = [json.loads(gzip.decompress((base / (label + '-result.json.gz')).read_bytes()))
           for label in labels]
assert all(result['deadlineQualified'] is False and result['runtimeParity'] is False
           and len(result['result']['program']) == 14 for result in results)
for key in ['oracle', 'files', 'result']:
    assert results[0][key] == results[1][key], key
for result in results:
    assert all(Path(row['path']).read_text() == row['source'] for row in result['sources'])
facts = results[1]['runtimeScope']
assert facts['hits'] == 3624 and facts['misses'] == facts['stores'] == facts['rows'] == 24
resources = [json.loads((base / (label + '.memory.json')).read_bytes()) for label in labels]
assert all(row['exitCode'] == 0 and not row['stopped']
           and not Path('/proc', str(row['pid'])).exists() for row in resources)
comparison = dict(translationMilliseconds=[row['stages'][1]['elapsedMs'] for row in results],
                  commandSeconds=[row['elapsedSeconds'] for row in resources],
                  sampledCgroupBytes=[row['peakSampledCgroupBytes'] for row in resources],
                  completeTranslationOutputsEqual=True, runtimeScope=facts,
                  controlledPerformanceComparison=False, performanceQualified=False,
                  wholeOriginalTestQualified=False, productionChangeInstalled=False,
                  newExecutableFunctions=0)
assert comparison['translationMilliseconds'][1] > comparison['translationMilliseconds'][0]
paths = {Path(__file__).relative_to(Path.cwd()),
         Path('experiments/issue-784/inspect-owned-source-profile-functions.py'),
         base / 'current-owned-base64-function-attribution.json.gz',
         base / 'current-owned-base64-function-attribution.log'}
for label, result in zip(labels, results):
    paths.update(base / (label + suffix) for suffix in
                 ['-cpu.json.gz', '-result.json.gz', '.memory.json', '.log'])
    paths.update(Path(row['path']) for row in result['sources'])
paths = sorted(paths)
assert sum(path.stat().st_size for path in paths) < 12_000_000


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path)) for path in paths]
archive = Path('docs/case-studies/issue-784/evidence/current-owned-runtime-scope-profile.tar.gz')
receipt = archive.with_name('current-owned-runtime-scope-profile.json.gz')
assert not archive.exists() and not receipt.exists()
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
expected, seen = {row['path']: row for row in rows}, set()
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
record = dict(schema='finite-owned-runtime-scope-profile-evidence-v1',
              parentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              completeMembers=rows, resources=resources, comparison=comparison,
              fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['parentHead', 'archive', 'bytes', 'sha256']}))
print(json.dumps(comparison))
