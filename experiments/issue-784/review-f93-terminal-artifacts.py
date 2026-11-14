"""Review every terminal artifact without installing its computed outputs.

All containers and members are read completely and checked against custody.
Complete failed case records remain in compressed JSON, outside the terminal.
"""
import gzip
import hashlib
import io
import json
import lzma
from pathlib import Path
import tarfile
import zipfile

base = Path('ci-logs/issue-784-restart-2')
collection = json.loads((base / 'current-f93-terminal-artifact-collection.json').read_bytes())
assert collection['terminalSnapshotComplete'] and len(collection['records']) == 42
head = 'f93b01795a935317942adfe7d329f636dcd1848b'
assert collection['headSha'] == head
output = base / 'checkpointf93-terminal-artifact-review.json.gz'
assert not output.exists()
records = []
for collected in collection['records']:
    if collected['id'] == 13813764049:
        continue
    custody = json.loads(Path(collected['receipt']).read_bytes())
    path = Path(custody['file'])
    assert custody['metadata']['id'] == collected['id']
    assert custody['metadata']['workflow_run']['head_sha'] == head
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == custody['sha256']
    with lzma.open(path, 'rb') as source:
        data = source.read(64_000_001)
        assert not source.read(1)
    assert len(data) == custody['zipBytes']
    assert hashlib.sha256(data).hexdigest() == custody['zipSha256']
    expected = {row['path']: row for row in custody['members']}
    record = dict(id=collected['id'], name=collected['name'],
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
    print(json.dumps(dict(id=record['id'], name=record['name'],
        audits=len(record['deadlineAudits']),
        durationBreaches=sum(audit['durationBreaches'] for audit in record['deadlineAudits']),
        failedCaseEvents=sum(len(audit['failedEvents']) for audit in record['deadlineAudits']),
        bunFailures=sum(len(item['failedRecords']) for item in record['bunReceipts']),
        failedResources=len(record['failedResources']), failureLines=len(record['failureLines']))), flush=True)

with gzip.open(base / 'checkpointf93-canonical-complete-decoded.json.gz', 'rt') as source:
    custody = json.load(source)
canonical = Path(custody['retainedArchive'])
with canonical.open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == custody['retainedSha256']
manifest = None
with tarfile.open(canonical, 'r|xz') as archive:
    for member in archive:
        if member.name == 'complete-9ub9ig/manifest.json':
            assert member.size <= 4_000_000
            manifest = json.loads(archive.extractfile(member).read())
assert manifest['schema'] == 'unqualified-complete-bulk-draft-v1'
assert manifest['runtimeParity'] is False and manifest['semanticAuthority'] is False
members = {row['path']: row for row in custody['members']}
outputs = {row['storedAs'][:-3]: row for row in manifest['members']}
assert len(outputs) + 1 == len(members)
assert len(outputs) == len(manifest['plan']['outputs'])
assert sum(row['bytes'] for row in outputs.values()) == manifest['completeBytes']
inventory = None
seen = set()
with tarfile.open(canonical, 'r|xz') as archive:
    for member in archive:
        assert member.isfile() and member.name in members and member.name not in seen
        expected = members[member.name]
        assert member.size == expected['bytes']
        source = archive.extractfile(member)
        if member.name.endswith('/manifest.json'):
            assert hashlib.file_digest(source, 'sha256').hexdigest() == expected['sha256']
        else:
            row = outputs[Path(member.name).name]
            assert row['bytes'] == expected['bytes'] and row['sha256'] == expected['sha256']
            if row['path'] == 'parity/rust-source-inventory.json':
                assert member.size <= 64_000_000
                body = source.read()
                assert hashlib.sha256(body).hexdigest() == expected['sha256']
                inventory = json.loads(body)
            else:
                assert hashlib.file_digest(source, 'sha256').hexdigest() == expected['sha256']
        seen.add(member.name)
assert seen == set(members) and inventory is not None
record = dict(id=13813764049, name=custody['metadata']['name'],
    completeDecodedPayloadBytes=custody['completeDecodedPayloadBytes'],
    completeOutputCount=len(outputs), completeManifest=manifest,
    inventoryTotals=inventory['totals'], functionCoverage=inventory['functionCoverage'],
    projects=inventory['projects'], diagnosticCounts=inventory['diagnosticCounts'],
    actualSourceCount=len(inventory['sources']), runtimeParity=inventory['runtimeParity'],
    semanticAuthority=False, installedAsCurrent=False, completeMemberReadbackVerified=True)
records.append(record)
result = dict(schema='terminal-current-head-artifact-review-v1', headSha=head,
    runId=42921384009, completeCycleCollected=True, artifactCount=len(records),
    completeMemberReadbackVerified=True, records=records, runtimeParity=False)
encoded = json.dumps(result, separators=(',', ':')).encode()
assert len(encoded) < 64_000_000
with output.open('xb') as target:
    target.write(gzip.compress(encoded, mtime=0))
assert gzip.decompress(output.read_bytes()) == encoded
print(json.dumps({key: value for key, value in record.items() if key != 'completeManifest'}), flush=True)
