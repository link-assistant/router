"""Join terminal job logs and completely inspected CI deadline receipts."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', type=Path, required=True)
parser.add_argument('--inspection', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
snapshot = json.loads(gzip.decompress(args.snapshot.read_bytes()))
inspection = json.loads(gzip.decompress(args.inspection.read_bytes()))
assert snapshot['run']['status'] == 'completed'
assert all(row['status'] == 'completed' for row in snapshot['jobs'])
assert not args.output.exists()
jobs, audits, bun = [], [], []
pattern = re.compile(r'not ok |##\[error\]|error TS\d|ENOENT|inventory differs|Strict native parity failed|deterministic --check diagnostics')
for row in snapshot['logs']:
    raw = gzip.decompress(Path(row['path']).read_bytes())
    assert len(raw) == row['rawBytes']
    assert hashlib.sha256(raw).hexdigest() == row['rawSha256']
    lines = raw.decode('utf8', errors='replace').splitlines()
    found = [number for number, line in enumerate(lines) if pattern.search(line)]
    selected = set()
    for number in found:
        selected.update(range(max(0, number - 2), min(len(lines), number + 9)))
    jobs.append({'job': row['job'], 'completeLog': row['path'],
                 'rawSha256': row['rawSha256'], 'rawLines': len(lines),
                 'matchedLines': [number + 1 for number in found],
                 'contexts': [{'line': number + 1, 'text': lines[number]}
                              for number in sorted(selected)]})
for artifact in inspection['records']:
    for row in artifact['completeOriginalJsonReports']:
        report = row['value']
        if row['path'].endswith('/case-deadlines.json'):
            breaches = [item for item in report['records']
                        if item['deadline']['kind'] == 'finite-source-deadline'
                        and item['durationMs'] > item['deadline']['milliseconds']]
            audits.append({'artifactId': artifact['metadata']['id'],
                           'member': row['path'], 'passed': report['passed'],
                           'errors': report['errors'], 'breaches': breaches,
                           'failedCompletions': [item for item in report['records']
                                                 if item['type'] == 'test:fail']})
        if report.get('schema') != 'complete-fresh-process-bun-reverse-shard-v1':
            continue
        records = [item for item in report['records'] if item['status'] != 'passed']
        prefixes = [str(Path(row['path']).parent) + '/' + item['path']
                    for record in records for item in record.get('logs', [])]
        bun.append({'artifactId': artifact['metadata']['id'], 'member': row['path'],
                    'allSelectedFilesExecuted': report['allSelectedFilesExecuted'],
                    'exitCode': report['exitCode'], 'records': records,
                    'fullRetainedFailureStreams': [item for item in artifact['completeSelectedRawLogs']
                                                   if item['path'] in prefixes]})
result = {'schema': 'inspected-terminal-ci-failure-index-v1',
          'runId': snapshot['run']['id'], 'headSha': snapshot['run']['head_sha'],
          'wholeCycleTerminal': True, 'allJobLogsAvailable': not snapshot['pendingLogJobs'],
          'pendingLogJobs': snapshot['pendingLogJobs'], 'logs': jobs,
          'nodeAudits': audits, 'bunReceipts': bun,
          'scope': 'Matched log contexts are an index, not causal classification. '
                   'Expected auditor fixture failures must be distinguished from parent failures. '
                   'Complete original log streams and inspected receipts remain separate inputs.',
          'allRequiredChecksPassed': False, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(result, separators=(',', ':')).encode()
with args.output.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(args.output.read_bytes()) == raw
print(json.dumps({'jobs': len(jobs), 'nodeAudits': len(audits),
                  'bunReceipts': len(bun), 'observedDeadlineBreaches': sum(len(row['breaches']) for row in audits),
                  'output': str(args.output)}))
