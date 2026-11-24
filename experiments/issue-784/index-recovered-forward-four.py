"""Join the complete recovered shard to the immutable published-head inventory."""
import gzip
import hashlib
import io
import itertools
import json
from pathlib import Path
import re
import zipfile

base = Path('ci-logs/issue-784-restart-2')
old_name = 'receiving-batch-complete-log-failure-index-13-qualified-v2.json.gz'
old = json.loads(gzip.decompress((base / old_name).read_bytes()))
snapshot = json.loads((base / 'current-translation-four-rerun-live-9.json').read_bytes())
assert old['headSha'] == snapshot['headSha'] == '28aba1b62f98608e65bb86bb550e0debe4445f16'
assert snapshot['status'] == 'completed' and snapshot['conclusion'] == 'failure'
job = next(row for row in snapshot['jobs'] if row['databaseId'] == 128636368388)
assert job['status'] == 'completed' and job['conclusion'] == 'failure'
path = base / 'receiving-batch-artifact-13606168221.zip'
with path.open('rb') as stream:
    archive_sha = hashlib.file_digest(stream, 'sha256').hexdigest()
lines = batches = 0
digest = hashlib.sha256()
failures = []
active = None
with zipfile.ZipFile(path) as archive:
    member = 'complete-8FiPAI/stdout.raw.tap'
    with archive.open(member) as packed:
        with io.TextIOWrapper(packed, encoding='utf8', errors='strict', newline='') as source:
            while batch := list(itertools.islice(source, 1500)):
                batches += 1
                for raw in batch:
                    lines += 1
                    digest.update(raw.encode('utf8'))
                    text = raw.rstrip('\n')
                    if text.startswith('not ok '):
                        active = {'line': lines, 'text': text,
                                  'details': [], 'blockEndLine': None}
                        failures.append(active)
                    elif active and text == '  ...':
                        active['blockEndLine'] = lines
                        active = None
                    elif active and re.match(r'^  (?:duration_ms|location|failureType|error|code|name|exitCode):', text):
                        active['details'].append({'line': lines, 'text': text[:4096],
                                                  'completeLine': len(text) <= 4096,
                                                  'completeLineSha256': hashlib.sha256(text.encode()).hexdigest()})
    audit_member = 'complete-8FiPAI/case-deadlines.json'
    raw_audit = archive.read(audit_member)
    audit = json.loads(raw_audit)
    terminal = json.loads(archive.read('complete-8FiPAI/terminal.json'))
assert active is None and len(failures) == audit['originalFailedCompletionEvents'] == 10
assert audit['observedCompletedCases'] == 633 and not audit['originalCaseLimitsChanged']
assert audit['allEventsForwardedToBuiltinTap']
assert terminal['childClosed'] and terminal['allCaseLimitsUnchanged']
records = [row for row in old['records'] if row['validJobLog']]
unavailable = [row for row in old['records'] if not row['validJobLog']]
assert len(records) == 29 and len(unavailable) == 1
record = {'jobId': job['databaseId'], 'name': job['name'], 'attempt': 2,
          'status': job['status'], 'conclusion': job['conclusion'],
          'startedAt': job['startedAt'], 'completedAt': job['completedAt'],
          'file': str(path), 'archiveSha256': archive_sha, 'member': member,
          'decodedSha256': digest.hexdigest(), 'lines': lines, 'readBatches': batches,
          'validJobLog': False, 'completeRawTapArtifact': True,
          'diagnosticAvailability': 'complete original raw TAP artifact; GitHub CLI log ends early',
          'maximumReadBatchLines': 1500, 'failureLines': failures,
          'failedCompletionEvents': [row for row in audit['records'] if row['type'] == 'test:fail'],
          'observedCompletedCases': audit['observedCompletedCases'],
          'cliLog': str(base / 'current-translation-four-rerun-complete.log'),
          'cliLogIsCompleteTestStream': False}
records.append(record)
audits = old['originalDeadlineAudits'] + [{
    'file': str(path), 'member': audit_member,
    'memberSha256': hashlib.sha256(raw_audit).hexdigest(),
    **{key: audit[key] for key in ['passed', 'originalCaseLimitsChanged',
                                 'durationBreaches', 'originalFailedCompletionEvents', 'errors']}}]
result = {'schema': 'current-ci-complete-recovered-failure-index-v1',
          'headSha': snapshot['headSha'], 'runId': 42443083163,
          'cycleStatus': snapshot['status'], 'conclusion': snapshot['conclusion'],
          'completeCycleCollected': True, 'records': records,
          'originalDeadlineAudits': audits, 'originalUnavailableResponses': unavailable,
          'supersedes': [old_name],
          'scope': 'All 30 original failed-job evidence groups collected across attempts at the same immutable head. The missing original shard log remains unavailable; its complete rerun TAP, terminal and audit supply diagnostics. Carried attempt-2 job IDs do not establish new executions. CI remains failed.'}
output = base / 'receiving-batch-complete-recovered-failure-index.json.gz'
raw = json.dumps(result, indent=2).encode()
with output.open('xb') as stream:
    with gzip.GzipFile(fileobj=stream, mode='wb', mtime=0) as packed:
        packed.write(raw)
assert gzip.decompress(output.read_bytes()) == raw
print(json.dumps({'output': str(output), 'jobEvidenceGroups': len(records),
                  'deadlineAudits': len(audits), 'recoveredFailures': len(failures),
                  'completeTapLines': lines, 'readBatches': batches,
                  'observedCompletedCases': audit['observedCompletedCases'],
                  'durationBreaches': audit['durationBreaches'],
                  'completeCycleCollected': True, 'ciPassed': False}))
