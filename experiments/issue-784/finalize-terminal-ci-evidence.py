"""Join an exact-head terminal CI cycle without hiding missing upstream logs.

This records inspection evidence; discarded artifact bytes are not in custody.
"""
import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--head', required=True)
parser.add_argument('--merge', required=True)
parser.add_argument('--run', required=True, type=int)
parser.add_argument('--prefix', required=True)
parser.add_argument('--collection', required=True, type=int)
parser.add_argument('--deadline-inspection', action='append', required=True)
parser.add_argument('--canonical-inspection')
args = parser.parse_args()
assert all(re.fullmatch('[0-9a-f]{40}', x) for x in [args.head, args.merge])
assert re.fullmatch('[a-z0-9-]{1,70}', args.prefix) and args.run > 0
base = Path('ci-logs/issue-784-restart-2')
inputs = []


def read(name):
    assert '/' not in name and '\\' not in name
    path = base / name
    raw = path.read_bytes()
    assert len(raw) <= 32 * 1024 * 1024
    inputs.append(dict(path=str(path), bytes=len(raw),
                       sha256=hashlib.sha256(raw).hexdigest()))
    return json.loads(gzip.decompress(raw) if name.endswith('.gz') else raw)


def pages(name, key):
    value = read(name)
    assert isinstance(value, list) and value
    return [row for page in value for row in page[key]]


view = read(args.prefix + '-terminal-view.json')
workflows = pages(args.prefix + '-terminal-workflows.json', 'workflow_runs')
artifacts = pages(args.prefix + '-terminal-artifacts.json', 'artifacts')
collection = read(args.prefix + '-collection-' + str(args.collection) + '.json.gz')
jobs = [row for page in collection['jobPages'] for row in page['jobs']]
assert view['headSha'] == args.head and view['databaseId'] == args.run
assert view['status'] == 'completed' and view['conclusion']
assert collection['headSha'] == args.head
assert collection['run']['id'] == args.run
assert collection['run']['status'] == 'completed'
assert jobs and len({row['id'] for row in jobs}) == len(jobs)
assert {row['id'] for row in jobs} == {row['databaseId'] for row in view['jobs']}
assert all(row['status'] == 'completed' and row['head_sha'] == args.head
           for row in jobs)
assert workflows and len({row['id'] for row in workflows}) == len(workflows)
assert args.run in {row['id'] for row in workflows}
assert all(row['status'] == 'completed' and row['head_sha'] == args.head
           for row in workflows)
conclusions = {row['databaseId']: row['conclusion'] for row in view['jobs']}
assert all(conclusions[row['id']] == row['conclusion'] for row in jobs)
nonpassing = {row['id'] for row in jobs
              if row['conclusion'] not in ('success', 'skipped')}
records = collection['records']
assert len(records) == len(nonpassing)
assert nonpassing == {row['job']['id'] for row in records}
available, unavailable = [], []
for row in records:
    assert row['headSha'] == args.head
    assert conclusions[row['job']['id']] == row['job']['conclusion']
    path = Path(row['log'])
    assert path.parent == base and path.name.startswith(args.prefix + '-job-')
    digest, size = hashlib.sha256(), 0
    with gzip.open(path, 'rb') as source:
        while block := source.read(65536):
            size += len(block)
            assert size <= 128 * 1024 * 1024
            digest.update(block)
    assert size == row['decodedBytes'] and digest.hexdigest() == row['sha256']
    if row['validJobLog']:
        assert row['downloadExitCode'] == 0 and size > 0
        available.append(row)
    else:
        assert row['downloadExitCode'] != 0
        unavailable.append(row)

inspections = {}
for name in args.deadline_inspection:
    inspection = read(name)
    for row in inspection['records']:
        assert row['allZipMembersReadAndCrcVerified']
        metadata = row['metadata']
        assert args.merge in metadata['name']
        assert row['sha256'] == metadata['digest'].removeprefix('sha256:')
        previous = inspections.get(metadata['id'])
        assert previous is None or previous == metadata
        inspections[metadata['id']] = metadata
canonical = None
if args.canonical_inspection:
    canonical = read(args.canonical_inspection)
    assert canonical['headSha'] == args.head
    assert canonical['allNestedCrcSha256AndCensusVerified']
    assert canonical['inventoryEqualsActualPlanManifest']
    inspections[canonical['metadata']['id']] = canonical['metadata']
assert len({row['id'] for row in artifacts}) == len(artifacts)
assert set(inspections) == {row['id'] for row in artifacts}
for artifact in artifacts:
    assert all(inspections[artifact['id']][key] == artifact[key]
               for key in ['name', 'size_in_bytes', 'digest'])

record = dict(schema='complete-terminal-ci-cycle-evidence-v2',
              headSha=args.head, mergeSha=args.merge, runId=args.run,
              allTerminalResultsCollected=True,
              allAvailableNonpassingLogsCollected=True,
              allNonpassingLogsAvailable=not unavailable,
              allArtifactsInspected=True,
              jobConclusions=dict(Counter(row['conclusion'] for row in jobs)),
              workflowConclusions=dict(Counter(row['conclusion'] for row in workflows)),
              jobs=jobs, workflows=workflows, artifacts=artifacts,
              availableLogs=available, unavailableLogs=unavailable,
              inputReceipts=inputs,
              canonicalNestedMembers=len(canonical['members']) if canonical else None,
              scope='Terminal published-head inspection evidence. Artifact archives '
                    'were inspected and discarded; receipts do not retain source bytes. '
                    'Any unavailable upstream log remains explicitly unfinished.',
              currentWorkingTreeFreshnessProved=False, fullGatePassed=False,
              runtimeParity=False, rustExecuted=False)
target = base / (args.prefix + '-final-cycle.json.gz')
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(target=str(target), jobs=record['jobConclusions'],
                      workflows=record['workflowConclusions'],
                      availableLogs=len(available), unavailableLogs=len(unavailable),
                      inspectedArtifacts=len(inspections))))
