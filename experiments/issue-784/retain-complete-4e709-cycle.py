"""Verify the terminal cycle and preserve the exact upstream log gap."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

BASE = Path('ci-logs/issue-784-restart-2')
HEAD = '4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2'
MERGE = '3c1b36039cac28b1940ccfe83f3770566e539aae'
RUN = 42498636979


def original_bytes(path):
    if path.exists():
        return path.read_bytes()
    return gzip.decompress(path.with_name(path.name + '.gz').read_bytes())


snapshot = json.loads(original_bytes(BASE / 'current-4e709-ci-snapshot-12.json'))
runs = [run for page in json.loads((BASE / 'current-4e709-final-runs-api.json').read_bytes())
        for run in page['workflow_runs']]
assert len(runs) == 7 and len({run['id'] for run in runs}) == 7
assert all(run['head_sha'] == HEAD and run['status'] == 'completed' for run in runs)
assert snapshot['headSha'] == HEAD and snapshot['databaseId'] == RUN
assert snapshot['status'] == 'completed' and len(snapshot['jobs']) == 59
assert all(job['status'] == 'completed' for job in snapshot['jobs'])
nonpassing = {job['databaseId']: job for job in snapshot['jobs']
              if job['conclusion'] in ['failure', 'cancelled', 'timed_out', 'action_required']}
logs = json.loads(original_bytes(BASE / 'current-4e709-ci-logs-12.json'))
assert len(nonpassing) == 25 and len(logs['records']) == 25
assert {row['job']['databaseId'] for row in logs['records']} == set(nonpassing)
external = []
missing = []


def identity(path):
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    return {'path': str(path), 'bytes': path.stat().st_size, 'sha256': digest}


for row in logs['records']:
    path = Path(row['log'])
    digest, length = hashlib.sha256(), 0
    with gzip.open(path, 'rb') as source:
        while block := source.read(65536):
            digest.update(block)
            length += len(block)
    assert length == row['decodedBytes'] and digest.hexdigest() == row['sha256']
    assert row['fullReadbackVerified']
    if row['validJobLog']:
        assert row['downloadExitCode'] in (None, 0)
    else:
        assert row['job']['databaseId'] == 128786335823 and row['downloadExitCode'] == 1
        raw = gzip.decompress(path.read_bytes())
        assert b'<Code>BlobNotFound</Code>' in raw
        missing.append({'jobId': 128786335823, 'status': 'cancelled',
                        'reason': 'GitHub returns HTTP 404 BlobNotFound; no shard artifact exists.',
                        'originalError': raw.decode('utf8'), 'completeJobLogAvailable': False})
    external.append(identity(path))
assert len(missing) == 1
artifacts = json.loads((BASE / 'current-4e709-final-artifact-verification-24.json').read_bytes())
metadata = [row for page in json.loads((BASE / 'current-4e709-final-artifacts-metadata.json').read_bytes())
            for row in page['artifacts']]
assert artifacts['headSha'] == HEAD and artifacts['runId'] == RUN
assert len(metadata) == len(artifacts['records']) == 24
assert {row['id'] for row in metadata} == {row['metadata']['id'] for row in artifacts['records']}
for row in artifacts['records']:
    assert row['metadata']['workflow_run']['head_sha'] == HEAD
    assert MERGE in row['metadata']['name'] and row['completeReadbackAndCrcVerified']
    actual = identity(Path(row['file']))
    assert actual['sha256'] == row['sha256']
    assert row['metadata']['digest'] == 'sha256:' + actual['sha256']
    assert actual['bytes'] == row['metadata']['size_in_bytes']
    external.append(actual)
assert not any(row['name'].endswith('-3') and '-translation-' in row['name']
               and '-reverse-' not in row['name'] for row in metadata)

names = ['current-4e709-ci-snapshot-12.json', 'current-4e709-ci-logs-12.json',
         'current-4e709-final-runs-api.json', 'current-4e709-final-artifacts-metadata.json',
         'current-4e709-final-artifact-verification-24.json',
         'current-4e709-tested-merge-commit.json', 'current-4e709-translation3-final-job.json',
         'current-4e709-translation3-final-job.stderr',
         'current-4e709-translation3-final-download.log',
         'current-4e709-translation3-final-download.stderr',
         'current-4e709-translation3-gh-run-view.log',
         'current-4e709-translation3-gh-run-view.stderr',
         'current-4e709-workflow-log-headers.log', 'current-4e709-workflow-log-headers.stderr']
members = []
for name in names:
    path = BASE / name
    raw = original_bytes(path)
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
record = {'schema': 'terminal-current-4e709-cycle-custody-v1', 'headSha': HEAD,
          'testedMergeSha': MERGE, 'runId': RUN, 'allSevenWorkflowsTerminal': True,
          'terminalJobCount': 59, 'nonpassingJobCount': 25, 'availableFullJobLogCount': 24,
          'availableArtifacts': 24, 'allAvailableArtifactsVerified': True,
          'completeCycleCollected': False, 'missingUpstreamLogs': missing,
          'members': members, 'externalMembers': external,
          'scope': 'All terminal results and available complete evidence. One upstream log remains unavailable.',
          'fullGatePassed': False, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
target = Path('docs/case-studies/issue-784/evidence/current-4e709-terminal-cycle.json.gz')
assert total + (0 if target.exists() else len(packed)) < 500_000_000
if target.exists():
    assert target.read_bytes() == packed
else:
    with target.open('xb') as output:
        output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(member['base64'], validate=True)
    assert len(restored) == member['bytes']
    assert hashlib.sha256(restored).hexdigest() == member['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'fullLogs': 24,
                  'unavailableFullLogs': 1, 'artifacts': 24, 'fullGatePassed': False}))
