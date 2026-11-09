"""Index complete current logs and deadline observations without extracting ZIPs."""
import argparse
import gzip
import json
from pathlib import Path
import re
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--logs', required=True)
parser.add_argument('--artifacts', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
base = Path('ci-logs/issue-784-restart-2')
assert all('/' not in value for value in [args.logs, args.artifacts, args.output])
logs = json.loads((base / args.logs).read_bytes())
artifacts = json.loads((base / args.artifacts).read_bytes())
assert logs['snapshot']['headSha'] == artifacts['headSha']
jobs, audits, bun = [], [], []
for row in logs['records']:
    findings = []
    with gzip.open(row['log'], 'rt', errors='replace') as source:
        for number, line in enumerate(source, 1):
            if re.search(r'not ok |##\[error\]|Error:|error TS\d|ENOENT|inventory differs', line):
                findings.append(dict(line=number, text=line.rstrip('\r\n')))
    jobs.append(dict(job=row['job'], validJobLog=row['validJobLog'], findings=findings))
for row in artifacts['records']:
    with zipfile.ZipFile(row['file']) as archive:
        for member in row['members']:
            if member['path'].endswith('/case-deadlines.json'):
                report = json.loads(archive.read(member['path']))
                breaches = [record for record in report['records']
                            if record['deadline']['kind'] == 'finite-source-deadline'
                            and record['durationMs'] > record['deadline']['milliseconds']]
                audits.append(dict(artifactId=row['metadata']['id'], member=member['path'],
                                   schema=report['schema'], passed=report['passed'],
                                   errors=report['errors'], breaches=breaches,
                                   failedCompletions=[record for record in report['records']
                                                      if record['type'] == 'test:fail']))
            if not member['path'].endswith('/receipt.json'):
                continue
            receipt = json.loads(archive.read(member['path']))
            if receipt.get('schema') != 'complete-fresh-process-bun-reverse-shard-v1':
                continue
            parent = str(Path(member['path']).parent)
            records = []
            for record in receipt['records']:
                streams = []
                for log in record.get('logs', []):
                    name = parent + '/' + log['path']
                    text = archive.read(name).decode('utf8', errors='replace')
                    failures = [{'line': number, 'text': line}
                                for number, line in enumerate(text.splitlines(), 1)
                                if re.search(r'\(fail\)|timeout|timed out|error:|Error:|^\s*\d+ fail', line)]
                    if failures:
                        streams.append(dict(member=name, findings=failures))
                records.append(dict(file=record['file'], status=record['status'],
                                    resource=record['resource'], failures=streams))
            bun.append(dict(artifactId=row['metadata']['id'], member=member['path'],
                            allSelectedFilesExecuted=receipt['allSelectedFilesExecuted'],
                            exitCode=receipt['exitCode'], records=records))
result = dict(schema='complete-current-ci-failure-index-v1',
              headSha=artifacts['headSha'], runId=artifacts['runId'],
              logs=jobs, nodeAudits=audits, bunReceipts=bun,
              controlFixtureFailuresAreNotParentFailures=True,
              allRequiredChecksPassed=False, rustExecuted=False)
with gzip.open(base / args.output, 'xb') as output:
    output.write(json.dumps(result).encode())
with gzip.open(base / args.output, 'rb') as source:
    assert json.load(source) == result
print(json.dumps(dict(jobs=len(jobs), nodeAudits=len(audits), bunReceipts=len(bun),
                      observedDeadlineBreaches=sum(len(row['breaches']) for row in audits),
                      output=args.output)))
