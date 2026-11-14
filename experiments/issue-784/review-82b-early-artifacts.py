"""Read all collected current-head artifact members and retain exact failures.

This partial collection cannot qualify the complete CI cycle.
"""
import gzip
import hashlib
import json
from pathlib import Path
import zipfile

base = Path('ci-logs/issue-784-restart-2')
records = []
for path in sorted(base.glob('checkpoint82b-artifact-*.zip')):
    custody = json.loads(path.with_suffix('.json').read_bytes())
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == custody['sha256']
    expected = {row['path']: row for row in custody['members']}
    record = dict(id=custody['metadata']['id'], name=custody['metadata']['name'],
                  deadlineAudits=[], bunReceipts=[], failedResources=[], failureLines=[])
    with zipfile.ZipFile(path) as packed:
        assert set(packed.namelist()) == set(expected)
        for member in packed.infolist():
            data = packed.read(member)
            assert len(data) == expected[member.filename]['bytes']
            assert hashlib.sha256(data).hexdigest() == expected[member.filename]['sha256']
            if member.filename.endswith('.json'):
                value = json.loads(data)
                if member.filename.endswith('case-deadlines.json'):
                    record['deadlineAudits'].append(dict(path=member.filename,
                        passed=value['passed'], errors=value['errors'],
                        durationBreaches=value['durationBreaches'],
                        observedCompletedCases=value['observedCompletedCases'],
                        originalFailedCompletionEvents=value['originalFailedCompletionEvents'],
                        failedEvents=[event for event in value['records']
                                      if event['type'] == 'test:fail']))
                elif isinstance(value, dict) and value.get('schema') == 'complete-fresh-process-bun-reverse-shard-v1':
                    record['bunReceipts'].append(dict(path=member.filename,
                        exitCode=value['exitCode'], allSelectedFilesExecuted=value['allSelectedFilesExecuted'],
                        failedRecords=[event for event in value['records'] if event['status'] != 'passed']))
                elif member.filename.endswith('resource.json') and value.get('exitCode') != 0:
                    record['failedResources'].append(dict(path=member.filename, value=value))
            elif member.filename.endswith(('.log', '.tap')):
                for number, line in enumerate(data.decode('utf8').splitlines(), 1):
                    if ('(fail)' in line or '::error' in line or 'not ok ' in line
                            or 'Observed ' in line and 'exceeds unchanged' in line):
                        record['failureLines'].append(dict(path=member.filename, line=number, text=line))
    records.append(record)
result = dict(schema='partial-current-head-artifact-review-v1',
              headSha='82bff66b3eaec603e296f1d888fe909dad4743c8',
              runId=42895668515, completeCycleCollected=False, records=records)
with gzip.open(base / 'checkpoint82b-early-artifact-review.json.gz', 'wt') as output:
    json.dump(result, output, separators=(',', ':'))
for record in records:
    print(json.dumps(record))
