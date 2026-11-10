"""Retain complete current-input repair proposals and whole receiving observations."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import tarfile

base = Path('ci-logs/issue-784-restart-2')
dest = Path('docs/case-studies/issue-784/evidence')
target = dest / 'current-inputs-and-live-reads-20261110.tar.gz'
receipt = dest / 'current-inputs-and-live-reads-20261110.json.gz'
assert not target.exists() and not receipt.exists()
prefixes = ['current-csv-static-refresh', 'unicode-receiver-before-node',
            'unicode-receiver-after-node', 'unicode-receiver-ascii-traced-node',
            'unicode-receiver-physical-node', 'unicode-receiver-physical-bun',
            'ascii-live-source-reads-install', 'ascii-live-source-reads-node',
            'ascii-live-source-reads-bun']
paths = [base / (prefix + suffix) for prefix in prefixes
         for suffix in ['.log', '.memory.json', '.observer.log']]
paths += list(base.glob('unicode-receiver-bun*'))
paths += [base / name for name in ['current-csv-static-refresh.json.gz',
          'ascii-live-source-reads-proposal.json.gz',
          'unicode-receiver-before-physical-probe.test.mjs',
          'unicode-f64-predecessor-diagnostic.diff']]
for name in ['complete-1GJk0e', 'complete-0b5WQY', 'complete-4YovWo',
             'complete-CDbeaI', 'complete-HTUjmT']:
    directory = Path('js/node_modules/.node-case-deadlines') / name
    paths += [path for path in directory.rglob('*') if path.is_file()]
paths += [Path(path) for path in [
    'tools/translation/current-unicode-asset-inputs.mjs',
    'tools/translation/ascii-live-source-reads.mjs',
    'tools/translation/prepare-unicode-ascii-asset-producers.mjs',
    'tools/translation/prepare-current-core-ascii-assets.mjs',
    'tools/translation/ascii-runtime-assets.mjs',
    'tools/translation/ascii-runtime-assets-source-data.mjs',
    'tools/translation/test/current-unicode-receiver-inputs.test.mjs',
    'tools/translation/test/current-unicode-ascii-asset-producers.test.mjs',
    'tools/translation/test/ascii-live-source-reads.test.mjs',
    'tools/translation/test/router-core-ascii-assets.test.mjs',
    'tools/translation/test/compilation-matrix.test.mjs',
    'experiments/issue-784/refresh-current-static-fixture.mjs',
    'experiments/issue-784/install-ascii-live-source-reads.mjs',
    'experiments/issue-784/run-unicode-receiver-bun.py',
    'experiments/issue-784/retain-current-inputs-and-live-reads.py',
    'docs/case-studies/issue-784/current-inputs-and-live-reads-20261110.md',
]]
paths = sorted(set(paths))
for path in paths:
    assert path.is_file() and not path.is_symlink()
    if path.name.endswith('.memory.json'):
        value = json.loads(path.read_bytes())
        assert not Path('/proc/' + str(value['pid'])).exists()
        assert not value['stopped']
fixture = json.loads(gzip.decompress((base / 'current-csv-static-refresh.json.gz').read_bytes()))
assert fixture['review']['historicalOccurrences'] == 1614
assert fixture['review']['currentFiles'] == 868
for row in fixture['proposal']['files']:
    raw = Path(row['path']).read_bytes()
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
audit = json.loads(Path('js/node_modules/.node-case-deadlines/complete-CDbeaI/case-deadlines.json').read_bytes())
assert audit['passed'] and audit['observedCompletedCases'] == 12 and audit['durationBreaches'] == 0
failed = json.loads(Path('js/node_modules/.node-case-deadlines/complete-HTUjmT/case-deadlines.json').read_bytes())
assert not failed['passed'] and failed['observedCompletedCases'] == 8 and failed['durationBreaches'] == 1
members = []
for path in paths:
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    members.append(dict(path=str(path), bytes=path.stat().st_size, sha256=digest))
allocation = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
        allocation += sum((Path(parent) / name).stat().st_size for name in files
                          if not (Path(parent) / name).is_symlink())
assert allocation + sum(row['bytes'] for row in members) < 498_000_000
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0, compresslevel=6) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as archive:
            for path in paths:
                archive.add(path, arcname=str(path), recursive=False)
with tarfile.open(target, 'r|gz') as archive:
    for expected, actual in zip(members, archive, strict=True):
        assert actual.name == expected['path'] and actual.size == expected['bytes']
        source = archive.extractfile(actual)
        assert hashlib.file_digest(source, 'sha256').hexdigest() == expected['sha256']
with target.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
record = dict(schema='complete-current-inputs-and-live-reads-custody-v1',
              archive=str(target), bytes=target.stat().st_size, sha256=digest,
              members=members, fullReadbackVerified=True,
              nodePhysicalAndMatrixCases=12, bunPhysicalAndMatrixCases=12,
              nodeAsciiAssertions=8, nodeAsciiDeadlineBreaches=1,
              bunAsciiPass=7, bunAsciiFail=1,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(target), bytes=target.stat().st_size,
                      sha256=digest, members=len(members))))
