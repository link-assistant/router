"""Move the complete terminal 815527 cycle into reviewed permanent custody."""
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ci-815527')
head = '815527efb3db40ca7e650ba9aaae47bfa1529dab'
prefix = 'current-815527-'


def read(name):
    path = base / (prefix + name)
    with (gzip.open(path, 'rb') if name.endswith('.gz') else path.open('rb')) as source:
        return json.load(source)


logs = read('completed-logs-final.json')
normal = read('artifact-verification-final.json')
metadata = read('artifacts-final.json')
pages = metadata if isinstance(metadata, list) else [metadata]
artifacts = [row for page in pages for row in page['artifacts']]
runs = [run for run in read('terminal-recent-runs.json') if run['headSha'] == head]
jobs = logs['snapshot']['jobs']
assert len(runs) == 7 and all(run['status'] == 'completed' for run in runs)
assert logs['snapshot']['status'] == 'completed' and logs['completeCycleCollected']
assert logs['snapshot']['headSha'] == normal['headSha'] == head
assert len(jobs) == 59 and all(job['status'] == 'completed' for job in jobs)
assert Counter(job['conclusion'] for job in jobs) == {
    'failure': 19, 'success': 9, 'cancelled': 6, 'skipped': 25}
assert len(logs['records']) == 25
assert all(row['fullReadbackVerified'] and row['validJobLog'] for row in logs['records'])
assert {row['job']['databaseId'] for row in logs['records']} == {
    job['databaseId'] for job in jobs if job['conclusion'] not in ['success', 'skipped']}
assert len(artifacts) == 26 and len(normal['records']) == 25
assert all(row['completeReadbackAndCrcVerified'] for row in normal['records'])
assert {row['metadata']['id'] for row in normal['records']} | {13656957918} == {
    row['id'] for row in artifacts}
for name, key in [
    ('canonical-artifact-verification.json.gz', 'completeCrcAndReadbackVerified'),
    ('canonical-member-verification.json.gz', 'completeNestedGzipCrcSha256AndCensusVerified'),
    ('canonical-input-review.json.gz', 'allDeclaredPublishedGitInputsVerified')]:
    receipt = read(name)
    assert receipt[key] and receipt['headSha'] == head
index = read('failure-index-final.json.gz')
assert index['headSha'] == head and len(index['logs']) == 25
assert len(index['nodeAudits']) == 22 and len(index['bunReceipts']) == 6
assert sum(len(row['breaches']) for row in index['nodeAudits']) == 44
controls = [(row['artifactId'], breach) for row in index['nodeAudits']
            for breach in row['breaches']
            if breach['name'] == 'synchronous overdue'
            and '/node-deadline-fixture-' in breach['file']]
assert len(controls) == 1 and controls[0][0] == 13654994975
assert controls[0][1]['deadline']['milliseconds'] == 10
assert not target.exists()


def digest(path):
    with path.open('rb') as source:
        result = hashlib.file_digest(source, 'sha256').hexdigest()
        os.posix_fadvise(source.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)
    return result


paths = sorted(base.glob(prefix + '*'))
members = []
for path in paths:
    assert path.is_file() and not path.is_symlink() and path.stat().st_uid == os.getuid()
    members.append(dict(originalPath=str(path), storedAs=path.name,
                        bytes=path.stat().st_size, sha256=digest(path)))
by_path = {row['originalPath']: row for row in members}
for row in normal['records']:
    assert by_path[row['file']]['sha256'] == row['sha256']
canonical = read('canonical-artifact-verification.json.gz')
assert by_path[canonical['file']]['sha256'] == canonical['archiveSha256']
record = dict(schema='complete-ci-815527-moved-original-custody-v1',
    headSha=head, runId=42576266498, members=members,
    sourcePathMapping='Original receipts retain original paths; storedAs selects this directory.',
    workflows=runs, jobs=jobs, nonpassingCompleteLogs=25, unavailableJobLogs=[],
    completeArtifacts=26, nodeAudits=22, bunReceipts=6,
    observedDeadlineBreaches=44, intentionalNegativeControlBreaches=1,
    actualDeadlineBreaches=43,
    normalCollectorCycleFlag='Original normal-only collector flag remains false; this receipt independently joins its 25 complete normal artifacts and the complete canonical artifact against all 26 terminal API rows.',
    wholeRunArchiveCollected=False,
    retentionHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    entireCycleTerminal=True, everyNonpassingJobResponseRetained=True,
    completeCycleLogsAvailable=True, allRequiredChecksPassed=False,
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
    assert digest(destination) == row['sha256'] and destination.stat().st_size == row['bytes']
with (target / 'manifest.json.gz').open('xb') as output:
    output.write(packed)
assert gzip.decompress((target / 'manifest.json.gz').read_bytes()) == raw
print(json.dumps(dict(directory=str(target), completeMembers=len(members),
    originalBytes=sum(row['bytes'] for row in members), completeReadbackVerified=True,
    evidenceBytesAfter=before + len(packed))))
