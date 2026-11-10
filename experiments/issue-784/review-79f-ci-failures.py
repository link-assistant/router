"""Read every retained current CI log and artifact; preserve complete failure records."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import zipfile

base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads(gzip.decompress((base / 'checkpoint79f-current-snapshot.json.gz').read_bytes()))
inventory = json.loads((base / 'checkpoint79f-artifact-verification.json').read_bytes())
logs, artifacts = [], []
for row in snapshot['logs']:
    data = gzip.decompress(Path(row['path']).read_bytes())
    assert len(data) == row['rawBytes'] and hashlib.sha256(data).hexdigest() == row['rawSha256']
    lines = data.decode('utf8').splitlines()
    findings = []
    for first in range(0, len(lines), 1500):
        for at in range(first, min(first + 1500, len(lines))):
            line = lines[at]
            if re.search(r'not ok \d|##\[error\]|stale:|Observed .*exceeds unchanged|Error:', line):
                findings.append(dict(line=at + 1, text=line, context=[dict(line=i + 1, text=lines[i])
                    for i in range(max(0, at - 3), min(len(lines), at + 9))]))
    logs.append(dict(job=row['job'], path=row['path'], lines=len(lines),
                     completeOriginalBytesVerified=True, findings=findings))
for row in inventory['records']:
    audits, bun, failures = [], [], []
    with zipfile.ZipFile(row['file']) as archive:
        for member in archive.infolist():
            expected = next(value for value in row['members'] if value['path'] == member.filename)
            with archive.open(member) as source:
                assert hashlib.file_digest(source, 'sha256').hexdigest() == expected['sha256']
            if member.filename.endswith('case-deadlines.json'):
                value = json.loads(archive.read(member))
                audits.append(dict(path=member.filename,
                    summary={key: value[key] for key in ['passed', 'observedCompletedCases',
                     'durationBreaches', 'errors', 'originalFailedCompletionEvents']},
                    originalFailures=[event for event in value['records'] if event['type'] == 'test:fail']))
            elif member.filename.endswith('/receipt.json'):
                value = json.loads(archive.read(member))
                if value.get('schema') == 'complete-fresh-process-bun-reverse-shard-v1':
                    bun.append(dict(path=member.filename, failedRecords=[event for event in value['records']
                        if event['status'] != 'passed'], exitCode=value['exitCode'],
                        allSelectedFilesExecuted=value['allSelectedFilesExecuted']))
            elif member.filename.endswith(('stderr.raw.log', 'stdout.raw.tap')):
                lines = archive.read(member).decode('utf8').splitlines()
                for first in range(0, len(lines), 1500):
                    for at in range(first, min(first + 1500, len(lines))):
                        line = re.sub(r'\x1b\[[0-9;]*m', '', lines[at])
                        if line.startswith('(fail) ') or re.search(r'^not ok \d', line):
                            failures.append(dict(path=member.filename, line=at + 1, text=line,
                                context=[dict(line=i + 1, text=lines[i])
                                 for i in range(max(0, at - 20), min(len(lines), at + 12))]))
    artifacts.append(dict(metadata=row['metadata'], audits=audits, bun=bun, rawFailures=failures,
                          allOriginalMembersReopenedAndVerified=True))
value = dict(schema='complete-current-ci-failure-review-v1', publishedHead=snapshot['run']['head_sha'],
             runId=snapshot['run']['id'], completeCycleCollected=snapshot['completeCycleCollected'],
             pendingLargeArtifacts=inventory['pendingLargeArtifacts'], logs=logs, artifacts=artifacts,
             fullGatePassed=False, rustExecuted=False)
target = base / 'checkpoint79f-current-failure-review.json.gz'
raw = (json.dumps(value, separators=(',', ':')) + '\n').encode()
target.write_bytes(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in artifacts:
    if not any(audit['summary']['errors'] or audit['summary']['originalFailedCompletionEvents'] for audit in row['audits']):
        continue
    print(row['metadata']['name'])
    for audit in row['audits']:
        for error in audit['summary']['errors']:
            print('  ' + error)
        for event in audit['originalFailures']:
            data = event.get('data',event)
            print('  ORIGINAL FAILURE: ' + str(data.get('name')) + ' ' + str(data.get('file')))
print(json.dumps(dict(logs=len(logs), artifacts=len(artifacts),
                     completeCycleCollected=value['completeCycleCollected'], target=str(target))))
