"""Pin every available terminal-cycle payload without making duplicate archives."""
import gzip
import hashlib
import json
from pathlib import Path
import zipfile

root = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ci-79f-terminal-20261110.json.gz')
snapshot = json.loads(gzip.decompress((root / 'checkpoint79f-current-snapshot.json.gz').read_bytes()))
run = snapshot['run']
assert run['id'] == 42832857700 and run['status'] == 'completed'
assert run['head_sha'] == '79f375ed1d9690ab8336e06a28331c2871092eb0'
assert len(snapshot['jobs']) == 59 and all(row['status'] == 'completed' for row in snapshot['jobs'])
failed = [row for row in snapshot['jobs'] if row['conclusion'] not in ['success', 'skipped']]
assert len(failed) == 24 and len(snapshot['logs']) == 23
assert [row['job']['id'] for row in snapshot['pendingLogJobs']] == [129887202892]
for row in snapshot['logs']:
    with gzip.open(row['path'], 'rb') as source:
        digest = hashlib.sha256()
        count = 0
        while chunk := source.read(65536):
            count += len(chunk)
            digest.update(chunk)
    assert count == row['rawBytes'] and digest.hexdigest() == row['rawSha256']

archive = root / 'checkpoint79f-complete-run-logs.zip'
members = []
with zipfile.ZipFile(archive) as packet:
    for member in packet.infolist():
        assert not member.is_dir()
        with packet.open(member) as source:
            digest = hashlib.file_digest(source, 'sha256').hexdigest()
        members.append(dict(path=member.filename, bytes=member.file_size,
                            crc32=member.CRC, sha256=digest))
assert len(members) == 229
# Exact leaf identity: reverse-translation (8) is a different job.
assert not any(' _ translation (8)' in row['path'].split('/')[0] for row in members)
annotations = json.loads((root / 'checkpoint79f-missing-job-annotations.json').read_bytes())
assert any(row['message'] == 'The job has exceeded the maximum execution time of 1h0m0s'
           for row in annotations)
artifacts = json.loads((root / 'checkpoint79f-current-artifacts.json').read_bytes())
artifact_rows = artifacts if isinstance(artifacts, list) else artifacts['artifacts']
assert len(artifact_rows) == 25
paths = sorted(path for path in root.glob('checkpoint79f*')
               if path.is_file() and path.name != 'checkpoint79f-terminal-retention.log')
assert len([path for path in paths if path.suffix == '.zip']) == 26
rows = []
for path in paths:
    assert not path.is_symlink()
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    rows.append(dict(path=str(path), bytes=path.stat().st_size, sha256=digest))
value = dict(schema='complete-available-79f-terminal-cycle-v1', run=run,
             jobs=snapshot['jobs'], nonpassingJobs=failed, completeFailureResultsCollected=True,
             allJobsTerminal=True, completeOriginalJobLogs=False,
             unavailableJobLog=snapshot['pendingLogJobs'][0],
             unavailableJobAnnotations=annotations, completeAvailableRunZipMembers=members,
             completeOriginalArtifactZipCount=25, artifacts=artifact_rows, payloads=rows,
             unavailableStdoutIsNotQualified=True, runtimeParity=False,
             fullGatePassed=False, rustExecuted=False)
raw = (json.dumps(value, separators=(',', ':')) + '\n').encode()
target.parent.mkdir(parents=True, exist_ok=True)
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in rows:
    path = Path(row['path'])
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
    assert path.stat().st_size == row['bytes']
print(json.dumps(dict(target=str(target), bytes=target.stat().st_size,
                      sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                      payloads=len(rows), availableJobLogs=23, unavailableJobLogs=1,
                      artifacts=25, runZipMembers=len(members))))
