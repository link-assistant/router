"""Read every retained terminal CI artifact and index its original failures."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import zipfile

base = Path('ci-logs/issue-784-restart-2')
inventory = json.loads((base / 'checkpoint-7e7-complete-artifact-review.json').read_bytes())
assert inventory['completeArtifactSetCollected'] and len(inventory['records']) == 25
records = []
for artifact in inventory['records']:
    row = dict(id=artifact['metadata']['id'], name=artifact['metadata']['name'],
               members=len(artifact['members']), deadlineAudits=[], bunReceipts=[],
               failedResourceRecords=[], originalFailureLines=[])
    if artifact.get('originalZipContainerBytesRetained') is False:
        row['completeBulkMembersSeparatelyReopened'] = True
        records.append(row)
        continue
    with gzip.open(artifact['file'], 'rb') as source:
        raw = source.read(64 * 1024 * 1024 + 1)
    assert len(raw) == artifact['metadata']['size_in_bytes']
    assert hashlib.sha256(raw).hexdigest() == artifact['sha256']
    expected = {member['path']: member for member in artifact['members']}
    with zipfile.ZipFile(io.BytesIO(raw)) as packed:
        assert set(packed.namelist()) == set(expected)
        for member in packed.infolist():
            data = packed.read(member)
            assert len(data) == expected[member.filename]['bytes']
            assert hashlib.sha256(data).hexdigest() == expected[member.filename]['sha256']
            if member.filename.endswith('.json'):
                value = json.loads(data)
                if member.filename.endswith('case-deadlines.json'):
                    row['deadlineAudits'].append(dict(path=member.filename,
                        passed=value['passed'], errors=value['errors'],
                        durationBreaches=value['durationBreaches'],
                        observedCompletedCases=value['observedCompletedCases'],
                        originalFailedCompletionEvents=value['originalFailedCompletionEvents'],
                        failedEvents=[event for event in value['records']
                                      if event['type'] == 'test:fail']))
                elif isinstance(value, dict) and value.get('schema') == 'complete-fresh-process-bun-reverse-shard-v1':
                    row['bunReceipts'].append(dict(path=member.filename,
                        exitCode=value['exitCode'], allSelectedFilesExecuted=value['allSelectedFilesExecuted'],
                        failedRecords=[event for event in value['records'] if event['status'] != 'passed']))
                elif member.filename.endswith('resource.json') and value.get('exitCode') != 0:
                    row['failedResourceRecords'].append(dict(path=member.filename, value=value))
            elif member.filename.endswith(('.log', '.tap')):
                lines = data.decode('utf8').splitlines()
                for number, line in enumerate(lines, 1):
                    if ('(fail)' in line or '::error' in line or 'not ok ' in line
                            or 'Observed ' in line and 'exceeds unchanged' in line):
                        row['originalFailureLines'].append(dict(path=member.filename,
                                                               line=number, text=line))
    records.append(row)
target = base / 'checkpoint-7e7-complete-artifact-failures.json'
with target.open('x') as output:
    json.dump(dict(schema='complete-terminal-ci-artifact-failure-index-v1',
                   headSha=inventory['headSha'], runId=inventory['runId'], records=records,
                   all25ArtifactsFullyRead=True, unavailableOriginalTranslation5Log=True,
                   completeCycleLogsAvailable=False), output, indent=2)
print(json.dumps(dict(target=str(target), artifacts=len(records), bytes=target.stat().st_size)))
