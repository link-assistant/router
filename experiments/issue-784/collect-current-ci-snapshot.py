"""Collect every completed non-passing job in one immutable-head snapshot."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads((base / sys.argv[1]).read_bytes())
head = sys.argv[3] if len(sys.argv) > 3 else '28aba1b62f98608e65bb86bb550e0debe4445f16'
file_prefix = sys.argv[4] if len(sys.argv) > 4 else 'receiving-batch-early'
assert re.fullmatch(r'[0-9a-f]{40}', head)
assert re.fullmatch(r'[a-z0-9-]+', file_prefix)
assert snapshot['headSha'] == head
records = []
for job in snapshot['jobs']:
    if job['status'] != 'completed' or job['conclusion'] in ['success', 'skipped']:
        continue
    identity = job['databaseId']
    path = base / (file_prefix + '-job-' + str(identity) + '.log.gz')
    reused = path.exists()
    status = None
    if not reused:
        with path.with_suffix('.stderr').open('ab') as errors, path.open('xb') as output:
            with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as packed:
                process = subprocess.Popen(['gh', 'api', '--allow-escape-sequences',
                    'repos/link-assistant/router/actions/jobs/' + str(identity) + '/logs'],
                    stdout=subprocess.PIPE, stderr=errors)
                while block := process.stdout.read(65536):
                    packed.write(block)
                status = process.wait()
    length, digest = 0, hashlib.sha256()
    prefix = b''
    with gzip.open(path, 'rb') as source:
        while block := source.read(65536):
            if not prefix:
                prefix = block[:1024]
            length += len(block)
            digest.update(block)
    valid_log = status in (None, 0) and bool(re.match(
        rb'^\d{4}-\d{2}-\d{2}T', prefix.lstrip(b'\xef\xbb\xbf \r\n')))
    records.append({'job': job, 'log': str(path), 'reusedWholeExistingLog': reused,
                    'downloadExitCode': status, 'decodedBytes': length,
                    'sha256': digest.hexdigest(), 'fullReadbackVerified': True,
                    'validJobLog': valid_log})
    print(json.dumps({'job': identity, 'name': job['name'], 'bytes': length,
                      'reused': reused, 'downloadExitCode': status,
                      'validJobLog': valid_log}), flush=True)
with (base / sys.argv[2]).open('x') as output:
    json.dump({'schema': 'current-completed-job-log-snapshot-v1', 'snapshot': snapshot,
               'records': records,
               'completeCycleCollected': snapshot['status'] == 'completed'
                   and all(row['validJobLog'] for row in records)}, output)
