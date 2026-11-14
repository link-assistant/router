"""Relocate complete terminal CI bytes once, retaining unavailable-log evidence."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import zipfile

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/checkpoint-e881-terminal')
head = 'e88183bb894b9ea62c9d6ae170c3fc099047685b'
run = 42784717613
snapshot = json.loads((base / 'checkpoint-e881-run-13.json').read_bytes())
assert snapshot['status'] == 'completed' and snapshot['conclusion'] == 'failure'
assert snapshot['headSha'] == head and snapshot['databaseId'] == run
logs = json.loads((base / 'checkpoint-e881-completed-logs-terminal.json').read_bytes())
nonpassing = [r for r in snapshot['jobs'] if r['conclusion'] in ['failure', 'cancelled']]
assert len(nonpassing) == len(logs['records']) == 22
assert {r['databaseId'] for r in nonpassing} == {r['job']['databaseId'] for r in logs['records']}
missing = []
for row in logs['records']:
    raw = gzip.decompress(Path(row['log']).read_bytes())
    assert len(raw) == row['decodedBytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
    assert row['fullReadbackVerified']
    if not row['validJobLog']:
        assert row['job']['databaseId'] == 129722966519 and b'BlobNotFound' in raw
        missing.append(row['job']['name'])
assert len(missing) == 1
whole = base / 'checkpoint-e881-terminal-whole-run.zip'
with zipfile.ZipFile(whole) as archive:
    names = archive.namelist()
    assert not any(' _ translation (5)' in name for name in names)
artifacts = json.loads((base / 'checkpoint-e881-complete-artifact-review.json').read_bytes())
assert artifacts['headSha'] == head and artifacts['runId'] == run
assert artifacts['completeArtifactSetCollected'] and len(artifacts['records']) == 25
assert all(r['completeReadbackAndCrcVerified'] for r in artifacts['records'])
inspection = json.loads(gzip.decompress((base / 'checkpoint-e881-canonical-inspection.json.gz').read_bytes()))
assert inspection['allNestedCrcSha256AndCensusVerified'] and inspection['archiveRetained']
paths = sorted(p for p in base.iterdir() if p.is_file() and p.name.startswith('checkpoint-e881-'))
assert 25 <= len(paths) <= 256 and not target.exists()
rows = []
for p in paths:
    state = p.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    with p.open('rb') as source:
        sha = hashlib.file_digest(source, 'sha256').hexdigest()
    rows.append(dict(originalPath=str(p), path=str(target / p.name), bytes=state.st_size,
                     sha256=sha, identity=[state.st_dev, state.st_ino, state.st_mtime_ns, state.st_ctime_ns]))
selected = {str(p.resolve()) for p in paths}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        descriptors = list((process / 'fd').iterdir())
    except OSError:
        continue
    for descriptor in descriptors:
        try:
            assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
target.mkdir()
for p, row in zip(paths, rows):
    state = p.lstat()
    assert [state.st_dev, state.st_ino, state.st_mtime_ns, state.st_ctime_ns] == row['identity']
    p.rename(row['path'])
    restored = Path(row['path'])
    with restored.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
    assert restored.stat().st_size == row['bytes'] and not p.exists()
record = dict(schema='complete-available-e881-terminal-cycle-custody-v1', headSha=head,
              runId=run, terminalCycleObserved=True, all25ArtifactsRetained=True,
              completeOriginalZipBytesRetained=True, wholeRunArchiveRetained=True,
              nonpassingJobs=22, availableCompleteNonpassingLogs=21,
              unavailableOriginalLogs=missing, completeCycleLogsCollected=False,
              fullOriginalUnavailableResponseRetained=True,
              canonicalNestedOutputs=2873, canonicalDecodedBytes=319736661,
              canonicalFreshnessProved=False, members=rows,
              relocatedWithoutDuplicateContainers=True, completeReadbackVerified=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
receipt = target / 'custody.json.gz'
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({k: v for k, v in record.items() if k != 'members'}))
print(json.dumps(dict(files=len(rows), retainedBytes=sum(r['bytes'] for r in rows))))
