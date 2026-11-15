"""Retain the terminal 02bf CI cycle, including the unavailable-log response.

Run only after its canonical inspection and current local gate have finished.
Moving the original evidence preserves budget without duplicating archives.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ci-02bf')
head = '02bf28e5dd6ce7bb90f6a75cfabcb339b895b43a'
logs = json.loads((base / 'current-02bf-api-logs-15.json').read_bytes())
metadata = json.loads((base / 'current-02bf-artifacts-15.json').read_bytes())
pages = metadata if isinstance(metadata, list) else [metadata]
artifacts = [row for page in pages for row in page['artifacts']]
runs_pages = json.loads((base / 'current-02bf-all-runs-final.json').read_bytes())
runs = [row for page in runs_pages for row in page['workflow_runs']]
applicable = [run for run in runs if run['head_sha'] == head]
assert len(applicable) == 7 and all(run['status'] == 'completed' for run in applicable)
assert logs['snapshot']['status'] == 'completed'
assert logs['snapshot']['headSha'] == head
assert len(logs['snapshot']['jobs']) == 59
assert all(job['status'] == 'completed' for job in logs['snapshot']['jobs'])
assert {row['job']['databaseId'] for row in logs['records']} == {
    job['databaseId'] for job in logs['snapshot']['jobs']
    if job['conclusion'] not in ['success', 'skipped']}
assert len(logs['records']) == 23
missing = []
for row in logs['records']:
    assert row['fullReadbackVerified']
    decoded = gzip.decompress(Path(row['log']).read_bytes())
    assert len(decoded) == row['decodedBytes']
    assert hashlib.sha256(decoded).hexdigest() == row['sha256']
    if not row['validJobLog']:
        missing.append(row)
        assert b'BlobNotFound' in decoded
assert len(missing) == 1 and missing[0]['job']['databaseId'] == 129207491917
assert (base / 'current-02bf-translation7-retry.log').stat().st_size == 0
assert b'log not found' in (base / 'current-02bf-translation7-retry.stderr').read_bytes()
whole = json.loads((base / 'current-02bf-terminal-whole-run-verification.json').read_bytes())
assert whole['wholeArchiveVerified'] and whole['headSha'] == head
assert len(whole['members']) == 137
assert not any('JavaScript first (same commit) _ translation (7)' in row['path']
               for row in whole['members'])
archive = base / 'current-02bf-terminal-whole-run.zip'
assert archive.stat().st_size == whole['bytes']
with archive.open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == whole['sha256']
normal = []
for path in sorted(base.glob('current-02bf-deadline-inspection-*.json.gz')):
    report = json.loads(gzip.decompress(path.read_bytes()))
    inspected_metadata = json.loads(Path(report['snapshot']).read_bytes())
    inspected_pages = inspected_metadata if isinstance(inspected_metadata, list) else [inspected_metadata]
    assert all(row['workflow_run']['head_sha'] == head
               for page in inspected_pages for row in page['artifacts'])
    normal.extend(report['records'])
assert len(normal) == 24
assert len({row['metadata']['id'] for row in normal}) == 24
assert all(row['allZipMembersReadAndCrcVerified'] for row in normal)
assert {row['metadata']['id'] for row in normal} | {13684712538} == {
    row['id'] for row in artifacts}
assert len(artifacts) == 25
canonical = json.loads(gzip.decompress(
    (base / 'current-02bf-canonical-inspection.json.gz').read_bytes()))
assert canonical['headSha'] == head
assert canonical['allNestedCrcSha256AndCensusVerified']
assert canonical['metadata']['id'] == 13684712538
assert canonical['archiveRetained'] is False
assert not target.exists()
paths = sorted(base.glob('current-02bf-*'))
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink() and path.stat().st_uid == os.getuid()
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    members.append(dict(originalPath=str(path), storedAs=path.name,
                        bytes=path.stat().st_size, sha256=digest))
record = dict(schema='complete-ci-02bf-moved-original-custody-v1',
    headSha=head, runId=42631154648, members=members,
    sourcePathMapping='Original receipts retain original paths; storedAs selects this directory.',
    workflows=applicable, jobs=logs['snapshot']['jobs'],
    nonpassingResponses=23, nonpassingCompleteLogs=22, unavailableJobLogs=missing,
    completeArtifactsInspected=25, canonicalSourceArchiveRetained=False,
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
