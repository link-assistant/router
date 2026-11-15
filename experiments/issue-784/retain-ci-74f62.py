"""Move complete terminal-cycle evidence into Git custody without duplicating ZIPs."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ci-74f62')
head = '74f62c037a21e4b3e4e3804dcf3d941d0aabfe19'
logs = json.loads((base / 'current-74f62-final-logs.json').read_bytes())
normal = json.loads((base / 'current-74f62-artifact-verification-final.json').read_bytes())
metadata = json.loads((base / 'current-74f62-artifacts-final.json').read_bytes())
pages = metadata if isinstance(metadata, list) else [metadata]
artifacts = [row for page in pages for row in page['artifacts']]
runs = json.loads((base / 'current-74f62-final-runs.json').read_bytes())
applicable = [run for run in runs if run['headSha'] == head]
assert len(applicable) == 7 and all(run['status'] == 'completed' for run in applicable)
assert logs['snapshot']['status'] == 'completed'
assert logs['snapshot']['headSha'] == normal['headSha'] == head
assert all(job['status'] == 'completed' for job in logs['snapshot']['jobs'])
assert all(row['fullReadbackVerified'] for row in logs['records'])
missing = [row for row in logs['records'] if not row['validJobLog']]
assert len(missing) == 1 and missing[0]['job']['databaseId'] == 128977139336
assert b'BlobNotFound' in gzip.decompress(Path(missing[0]['log']).read_bytes())
assert b'BlobNotFound' in (base / 'current-74f62-forward-5-log-retry.response').read_bytes()
whole = json.loads((base / 'current-74f62-terminal-whole-run-verification.json').read_bytes())
assert whole['wholeArchiveVerified'] and whole['headSha'] == head
assert not any('JavaScript first (same commit) _ translation (5)' in row['path']
               for row in whole['members'])
assert {row['job']['databaseId'] for row in logs['records']} == {
    job['databaseId'] for job in logs['snapshot']['jobs']
    if job['conclusion'] not in ['success', 'skipped']}
assert {row['metadata']['id'] for row in normal['records']} | {13650976310} == {
    row['id'] for row in artifacts}
assert all(row['completeReadbackAndCrcVerified'] for row in normal['records'])
for name, key in [('canonical-artifact-verification', 'completeCrcAndReadbackVerified'),
                  ('canonical-member-verification', 'completeNestedGzipCrcSha256AndCensusVerified'),
                  ('canonical-input-review', 'allDeclaredPublishedGitInputsVerified')]:
    receipt = json.loads(gzip.decompress((base / ('current-74f62-' + name + '.json.gz')).read_bytes()))
    assert receipt[key] and receipt['headSha'] == head
assert not target.exists()
paths = sorted(base.glob('current-74f62-*'))
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink() and path.stat().st_uid == os.getuid()
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    members.append(dict(originalPath=str(path), storedAs=path.name,
                        bytes=path.stat().st_size, sha256=digest))
record = dict(schema='complete-ci-74f62-moved-original-custody-v1',
    headSha=head, runId=42560989296, members=members,
    sourcePathMapping='Original receipts retain their original paths; storedAs selects this directory.',
    workflows=applicable, jobs=logs['snapshot']['jobs'],
    nonpassingResponses=len(logs['records']),
    nonpassingCompleteLogs=len(logs['records']) - len(missing),
    unavailableJobLogs=missing, completeArtifacts=len(artifacts),
    retentionHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    entireCycleTerminal=True, everyNonpassingJobResponseRetained=True,
    completeCycleLogsAvailable=False, allRequiredChecksPassed=False,
    currentWorkingTreeFreshnessProved=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
assert before + len(packed) < 500_000_000
target.mkdir()
for path, row in zip(paths, members, strict=True):
    destination = target / row['storedAs']
    path.rename(destination)
    with destination.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
    assert destination.stat().st_size == row['bytes']
with (target / 'manifest.json.gz').open('xb') as output:
    output.write(packed)
assert gzip.decompress((target / 'manifest.json.gz').read_bytes()) == raw
print(json.dumps(dict(directory=str(target), completeMembers=len(members),
    originalBytes=sum(row['bytes'] for row in members), completeReadbackVerified=True,
    evidenceBytesAfter=before + len(packed))))
