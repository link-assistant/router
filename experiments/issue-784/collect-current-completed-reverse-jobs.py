"""Retain complete early reverse-job logs without claiming a completed cycle."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = '28aba1b62f98608e65bb86bb550e0debe4445f16'
snapshot = json.loads((base / 'receiving-batch-live-main-1.json').read_bytes())
assert snapshot['headSha'] == head and snapshot['status'] == 'in_progress'
jobs = [job for job in snapshot['jobs'] if job['status'] == 'completed'
        and job['conclusion'] == 'failure'
        and '/ reverse' in job['name']]
assert 1 <= len(jobs) <= 17
records = []
for job in jobs:
    identity = job['databaseId']
    target = base / ('receiving-batch-early-job-' + str(identity) + '.log.gz')
    errors = target.with_name(target.name + '.stderr')
    command = ['gh', 'api', '--allow-escape-sequences',
               'repos/link-assistant/router/actions/jobs/' + str(identity) + '/logs']
    length, digest = 0, hashlib.sha256()
    with target.open('xb') as output, errors.open('xb') as stderr:
        with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as encoded:
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=stderr)
            while block := process.stdout.read(65536):
                encoded.write(block)
                length += len(block)
                digest.update(block)
            status = process.wait()
    actual, total = hashlib.sha256(), 0
    with gzip.open(target, 'rb') as source:
        while block := source.read(65536):
            actual.update(block)
            total += len(block)
    assert total == length and actual.hexdigest() == digest.hexdigest()
    records.append({'job': job, 'command': command, 'downloadExitCode': status,
                    'log': str(target), 'decodedBytes': length,
                    'sha256': digest.hexdigest(), 'fullReadbackVerified': True})
    print(json.dumps({'job': identity, 'name': job['name'],
                      'downloadExitCode': status, 'decodedBytes': length}), flush=True)
report = {'schema': 'early-complete-reverse-job-log-collection-v1',
          'headSha': head, 'snapshot': snapshot, 'records': records,
          'completeCycleCollected': False, 'runtimeParity': False}
with (base / 'receiving-batch-early-reverse-job-collection.json').open('x') as output:
    json.dump(report, output)
raise SystemExit(0 if all(row['downloadExitCode'] == 0 for row in records) else 1)
