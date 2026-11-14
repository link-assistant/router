"""Retain the rejected complete-production DATA experiment and exact timings."""
import gzip
import hashlib
import json
import lzma
from pathlib import Path
import tarfile

base = Path('ci-logs/issue-784-restart-2')
evidence = Path('docs/case-studies/issue-784/evidence')
results = []
for label, log in [('before-1', 'before-1-v2'), ('after-1', 'after-1'),
                   ('after-2', 'after-2'), ('before-2', 'before-2')]:
    value = json.loads((base / ('completed-derive-data-' + log + '.log')).read_text())
    raw = lzma.decompress((base / ('completed-derive-data-' + label + '-output.json.xz')).read_bytes())
    assert len(raw) == value['fullOutputBytes']
    assert hashlib.sha256(raw).hexdigest() == value['fullOutputSha256']
    context = json.loads(raw)['context']
    assert len(context['certificates']) == 419
    memory = json.loads((base / ('completed-derive-data-' + log + '.memory.json')).read_bytes())
    assert memory['exitCode'] == 0 and not memory['stopped']
    results.append(dict(result=value, memory=memory))
assert len({row['result']['fullOutputSha256'] for row in results}) == 1
draft = json.loads(gzip.decompress((base / 'completed-derive-data-source-draft.json.gz').read_bytes()))
assert all(Path(row['path']).read_text() == row['before'] for row in draft['files'])
paths = set(base.glob('completed-derive-data-*'))
paths.update(Path('experiments/issue-784') / name for name in [
    'draft-completed-derive-data.py', 'install-completed-derive-data-draft.mjs',
    'measure-completed-derive-data.mjs', 'retain-completed-derive-data.py',
    'run-observed-check.py', 'complete-evidence-json.mjs'])
archive = evidence / 'completed-derive-data-negative.tar.gz'
rows = []
with tarfile.open(archive, 'x:gz', compresslevel=6) as output:
    for path in sorted(paths):
        data = path.read_bytes()
        rows.append(dict(path=str(path), bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
        output.add(path, arcname=str(path), recursive=False)
expected = {row['path']: row for row in rows}
seen = set()
with tarfile.open(archive, 'r:gz') as source:
    for member in source:
        row = expected[member.name]
        assert member.isfile() and member.name not in seen and member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
before = sum(row['result']['totalMilliseconds'] for row in results if row['result']['label'].startswith('before')) / 2
after = sum(row['result']['totalMilliseconds'] for row in results if row['result']['label'].startswith('after')) / 2
assert after > before
record = dict(schema='complete-production-derive-data-negative-v1', archive=str(archive),
    archiveBytes=archive.stat().st_size, archiveSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
    members=rows, measurements=results, beforeMeanMilliseconds=before,
    afterMeanMilliseconds=after, slowerPercent=(after / before - 1) * 100,
    fullResultsEqual=True, allMembersFullyReadbackVerified=True,
    productionChangeRetained=False, productionExecutableGain=0,
    originalDeadlinesQualified=False, fullGatePassed=False, runtimeParity=False,
    initialEvidenceWriterOomPreserved=True, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = evidence / 'completed-derive-data-negative.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({key: value for key, value in record.items() if key not in ['members', 'measurements']}))
