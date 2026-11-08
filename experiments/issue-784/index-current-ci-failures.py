"""Index complete immutable-head logs in at most 1500-line read batches."""
import gzip
import hashlib
import itertools
import json
from pathlib import Path
import re
import sys
import zipfile

base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads((base / sys.argv[1]).read_bytes())
head = sys.argv[3] if len(sys.argv) > 3 else '28aba1b62f98608e65bb86bb550e0debe4445f16'
file_prefix = sys.argv[4] if len(sys.argv) > 4 else 'receiving-batch-early'
artifact_prefix = sys.argv[5] if len(sys.argv) > 5 else 'receiving-batch-artifact'
assert re.fullmatch(r'[0-9a-f]{40}', head)
assert re.fullmatch(r'[a-z0-9-]+', file_prefix)
assert re.fullmatch(r'[a-z0-9-]+', artifact_prefix)
assert snapshot['headSha'] == head
output = base / sys.argv[2]
assert not output.exists() and output.suffix == '.gz'
stamp = re.compile(r'^\d{4}-\d{2}-\d{2}T\S+Z ')
error = re.compile(r'^\s*(?:not ok \d+ - |error:|(?:Type|Syntax|Reference|Assertion|Range|Aggregate)?Error:|##\[error\])')
records = []
for job in snapshot['jobs']:
    if job['status'] != 'completed' or job['conclusion'] in ('success', 'skipped'):
        continue
    path = base / (file_prefix + '-job-' + str(job['databaseId']) + '.log.gz')
    assert path.exists()
    matches, digest, line_count, batches, first_line = [], hashlib.sha256(), 0, 0, None
    with gzip.open(path, 'rt', encoding='utf8', errors='strict', newline='') as source:
        while lines := list(itertools.islice(source, 1500)):
            batches += 1
            for raw in lines:
                line_count += 1
                if first_line is None:
                    first_line = raw.lstrip("\ufeff")
                digest.update(raw.encode('utf8'))
                text = stamp.sub('', raw.rstrip('\n'))
                if error.match(text):
                    matches.append({'line': line_count, 'text': text[:4096],
                                    'completeLine': len(text) <= 4096,
                                    'completeLineSha256': hashlib.sha256(text.encode()).hexdigest()})
    records.append({'jobId': job['databaseId'], 'name': job['name'],
                    'status': job['status'], 'conclusion': job['conclusion'],
                    'file': str(path), 'decodedSha256': digest.hexdigest(),
                    'lines': line_count, 'readBatches': batches,
                    'validJobLog': bool(first_line and stamp.match(first_line)),
                    'diagnosticAvailability': 'job-log' if first_line and stamp.match(first_line) else 'unavailable; retained GitHub HTTP error body',
                    'maximumReadBatchLines': 1500, 'failureLines': matches})
artifacts = []
for path in sorted(base.glob(artifact_prefix + '-*.zip')):
    with zipfile.ZipFile(path) as archive:
        for entry in archive.infolist():
            if not entry.filename.endswith('case-deadlines.json'):
                continue
            assert entry.file_size < 8 * 1024 * 1024
            raw = archive.read(entry)
            audit = json.loads(raw)
            artifacts.append({'file': str(path), 'member': entry.filename,
                              'memberSha256': hashlib.sha256(raw).hexdigest(),
                              'passed': audit.get('passed'),
                              'originalCaseLimitsChanged': audit.get('originalCaseLimitsChanged'),
                              'durationBreaches': audit.get('durationBreaches'),
                              'originalFailedCompletionEvents': audit.get('originalFailedCompletionEvents'),
                              'errors': audit.get('errors')})
record = {'schema': 'current-ci-complete-log-failure-index-v1',
          'headSha': snapshot['headSha'], 'runId': snapshot['databaseId'],
          'cycleStatus': snapshot['status'],
          'completeCycleCollected': snapshot['status'] == 'completed' and all(row['validJobLog'] for row in records),
          'records': records, 'originalDeadlineAudits': artifacts,
          'supersedes': ['receiving-batch-complete-log-failure-index-12.json.gz', 'receiving-batch-complete-log-failure-index-13.json.gz', 'receiving-batch-complete-log-failure-index-13-qualified.json.gz'] if head == '28aba1b62f98608e65bb86bb550e0debe4445f16' else [],
          'scope': 'All available original response bytes read. HTTP error bodies are explicitly unavailable job diagnostics. Index selects TAP and error lines; complete originals remain in their gzip logs and ZIP members.'}
raw = json.dumps(record, indent=2).encode()
with output.open('xb') as stream:
    with gzip.GzipFile(fileobj=stream, mode='wb', mtime=0) as packed:
        packed.write(raw)
with gzip.open(output, 'rb') as stream:
    assert stream.read() == raw
print(json.dumps({'jobsIndexed': len(records), 'deadlineAudits': len(artifacts),
                  'indexedErrorLines': sum(len(row['failureLines']) for row in records),
                  'bytes': len(raw), 'packedBytes': output.stat().st_size,
                  'completeCycleCollected': record['completeCycleCollected']}))
