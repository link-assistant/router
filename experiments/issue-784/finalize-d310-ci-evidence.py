"""Join the complete terminal CI results, available logs and artifact inspections."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
head = 'd3103700d0e8b0d44a6deec8062d2507cb0a2134'
run_id = 42658575228
inputs = []


def read(name):
    path = base / name
    raw = path.read_bytes()
    inputs.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
    return json.loads(gzip.decompress(raw) if name.endswith('.gz') else raw)


view = read('current-d310-terminal-view.json')
workflows = [row for page in read('current-d310-terminal-workflows.json') for row in page['workflow_runs']]
artifacts = [row for page in read('current-d310-terminal-artifacts.json') for row in page['artifacts']]
collection = read('current-d310-collection-8.json.gz')
jobs = [row for page in collection['jobPages'] for row in page['jobs']]
assert view['headSha'] == head and view['databaseId'] == run_id and view['status'] == 'completed'
assert len(jobs) == 33 and {row['id'] for row in jobs} == {row['databaseId'] for row in view['jobs']}
assert all(row['status'] == 'completed' and row['head_sha'] == head for row in jobs)
assert len(workflows) == 7 and all(row['status'] == 'completed' and row['head_sha'] == head for row in workflows)
nonpassing = {row['id'] for row in jobs if row['conclusion'] != 'success'}
assert nonpassing == {row['job']['id'] for row in collection['records']}
available, unavailable = [], []
for row in collection['records']:
    path = Path(row['log'])
    raw = gzip.decompress(path.read_bytes())
    assert len(raw) == row['decodedBytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
    (available if row['validJobLog'] else unavailable).append(row)
assert len(available) == 24 and [row['job']['id'] for row in unavailable] == [129303645283]
whole = read('current-d310-terminal-whole-run-verification.json')
archive = base / 'current-d310-terminal-whole-run.zip'
assert whole['wholeArchiveVerified'] and hashlib.sha256(archive.read_bytes()).hexdigest() == whole['sha256']
inspections = {}
for suffix in ['1', '2', '3', '4', '5', 'terminal']:
    inspection = read('current-d310-deadline-inspection-' + suffix + '.json.gz')
    for row in inspection['records']:
        assert row['allZipMembersReadAndCrcVerified']
        inspections[row['metadata']['id']] = row['metadata']
canonical = read('current-d310-canonical-inspection.json.gz')
assert canonical['headSha'] == head and canonical['allNestedCrcSha256AndCensusVerified']
assert canonical['inventoryEqualsActualPlanManifest']
inspections[canonical['metadata']['id']] = canonical['metadata']
assert len(artifacts) == 25 and set(inspections) == {row['id'] for row in artifacts}
for artifact in artifacts:
    inspected = inspections[artifact['id']]
    assert all(inspected[key] == artifact[key] for key in ['name', 'size_in_bytes', 'digest'])
record = dict(schema='complete-terminal-ci-cycle-evidence-v1', headSha=head, runId=run_id,
              allTerminalResultsCollected=True, allAvailableNonpassingLogsCollected=True,
              allArtifactsInspected=True, jobConclusions=dict(Counter(row['conclusion'] for row in jobs)),
              workflowConclusions=dict(Counter(row['conclusion'] for row in workflows)),
              jobs=jobs, workflows=workflows, artifacts=artifacts, availableLogs=available,
              unavailableLogs=unavailable, wholeRunArchive=whole, inputReceipts=inputs,
              missingLogReason='Forward shard 7 returns BlobNotFound; terminal gh recovery also returns log not found, and the verified whole-run ZIP contains no shard 7 log.',
              canonicalNestedMembers=len(canonical['members']),
              scope='Terminal published-head CI evidence. Missing upstream log remains explicit. Artifact bytes were inspected and discarded; nested receipts are not custody of source bytes.',
              currentWorkingTreeFreshnessProved=False, fullGatePassed=False, runtimeParity=False,
              rustExecuted=False)
target = base / 'current-d310-final-cycle.json.gz'
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(target=str(target), jobs=record['jobConclusions'], workflows=record['workflowConclusions'],
                      availableLogs=len(available), unavailableLogs=len(unavailable), inspectedArtifacts=len(inspections))))
