"""Preserve a second authenticated whole-log path for a missing job blob."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
path = base / 'checkpoint82b-terminal-job-130108034312-run-view.log.gz'
assert not path.exists()
command = ['gh', 'run', 'view', '42895668515', '--repo', 'link-assistant/router',
           '--job', '130108034312', '--log']
with path.open('xb') as output, path.with_suffix('.stderr').open('xb') as errors:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as packed:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=errors)
        while block := process.stdout.read(65536):
            packed.write(block)
        exit_code = process.wait()
size, digest, prefix = 0, hashlib.sha256(), b''
with gzip.open(path, 'rb') as source:
    while block := source.read(65536):
        if not prefix:
            prefix = block[:1024]
        size += len(block)
        digest.update(block)
record = dict(command=command, exitCode=exit_code, decodedBytes=size,
              sha256=digest.hexdigest(), fullReadbackVerified=True,
              previousDirectJobApiReturnedBlobNotFound=True,
              validLog=exit_code == 0 and size > 0 and b'BlobNotFound' not in prefix)
path.with_suffix('.json').write_text(json.dumps(record))
print(json.dumps(record))
