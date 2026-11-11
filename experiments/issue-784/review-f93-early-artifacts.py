"""Fully verify current collected ZIPs and retain all failed receiving records."""
import gzip
import hashlib
import io
import json
import lzma
from pathlib import Path
import zipfile

base = Path('ci-logs/issue-784-restart-2')
records = []
for path in sorted(base.glob('checkpointf93-artifact-*.zip.xz')):
    custody = json.loads(path.with_suffix('.json').read_bytes())
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == custody['sha256']
    with lzma.open(path, 'rb') as source:
        data = source.read(64_000_001)
    assert len(data) == custody['zipBytes']
    assert hashlib.sha256(data).hexdigest() == custody['zipSha256']
    expected = {row['path']: row for row in custody['members']}
    record = dict(id=custody['metadata']['id'], name=custody['metadata']['name'],
        deadlineAudits=[], bunReceipts=[], failedResources=[], failureLines=[])
    with zipfile.ZipFile(io.BytesIO(data)) as packed:
        assert set(packed.namelist()) == set(expected)
        for member in packed.infolist():
            body = packed.read(member)
            assert len(body) == expected[member.filename]['bytes']
            assert hashlib.sha256(body).hexdigest() == expected[member.filename]['sha256']
            if member.filename.endswith('.json'):
                value = json.loads(body)
                if member.filename.endswith('case-deadlines.json'):
                    record['deadlineAudits'].append(dict(path=member.filename,
                        passed=value['passed'], errors=value['errors'],
                        durationBreaches=value['durationBreaches'],
                        observedCompletedCases=value['observedCompletedCases'],
                        originalFailedCompletionEvents=value['originalFailedCompletionEvents'],
                        durationBreachRecords=[event for event in value['records'] if event.get('durationBreach')],
                        failedEvents=[event for event in value['records'] if event['type'] == 'test:fail']))
                elif isinstance(value, dict) and value.get('schema') == 'complete-fresh-process-bun-reverse-shard-v1':
                    record['bunReceipts'].append(dict(path=member.filename,
                        exitCode=value['exitCode'], allSelectedFilesExecuted=value['allSelectedFilesExecuted'],
                        failedRecords=[event for event in value['records'] if event['status'] != 'passed']))
                elif member.filename.endswith('resource.json') and value.get('exitCode') != 0:
                    record['failedResources'].append(dict(path=member.filename, value=value))
            elif member.filename.endswith(('.log', '.tap')):
                for number, line in enumerate(body.decode('utf8').splitlines(), 1):
                    if ('(fail)' in line or '::error' in line or 'not ok ' in line
                            or 'Observed ' in line and 'exceeds unchanged' in line):
                        record['failureLines'].append(dict(path=member.filename, line=number, text=line))
    records.append(record)
    print(json.dumps({'id': record['id'], 'name': record['name'],
        'durationBreaches': [breach for audit in record['deadlineAudits'] for breach in audit['durationBreachRecords']],
        'failedCaseEvents': sum(len(audit['failedEvents']) for audit in record['deadlineAudits']),
        'bunFailures': [dict(path=item.get('file', item.get('path')), status=item['status'])
            for receipt in record['bunReceipts'] for item in receipt['failedRecords']],
        'failedResourceCount': len(record['failedResources']),
        'failureLines': record['failureLines']}), flush=True)
result = dict(schema='partial-current-head-artifact-review-v1',
    headSha='f93b01795a935317942adfe7d329f636dcd1848b', runId=42921384009,
    completeCycleCollected=False, records=records)
output_path = base / 'checkpointf93-early-artifact-review.json.gz'
with output_path.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        compressed.write(json.dumps(result, separators=(',', ':')).encode())
with gzip.open(output_path, 'rt') as source:
    assert json.load(source) == result
