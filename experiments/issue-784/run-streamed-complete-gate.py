"""Run the unchanged complete gate, retaining its entire output as streamed gzip."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

assert len(sys.argv) == 2 and re.fullmatch('[a-z0-9-]{1,70}', sys.argv[1])
prefix = Path('ci-logs/issue-784-restart-2') / sys.argv[1]
target = prefix.with_name(prefix.name + '.log.gz')
receipt = prefix.with_name(prefix.name + '-stream.json')
assert not target.exists() and not receipt.exists()
command = ['node', '--max-old-space-size=128', 'scripts/check-js-first-local.mjs']
started = time.monotonic()
count = 0
digest = hashlib.sha256()
child = None
interrupted = None


def stop(signum, _frame):
    global interrupted
    interrupted = signal.Signals(signum).name
    if child is not None and child.poll() is None:
        child.send_signal(signum)


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', compresslevel=1, mtime=0) as packed:
        child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        try:
            while chunk := child.stdout.read(65536):
                digest.update(chunk)
                count += len(chunk)
                packed.write(chunk)
            status = child.wait()
            if interrupted and status == 0:
                status = 128 + getattr(signal, interrupted)
        finally:
            child.stdout.close()
checked_count, checked_digest = 0, hashlib.sha256()
with gzip.open(target, 'rb') as source:
    while chunk := source.read(65536):
        checked_count += len(chunk)
        checked_digest.update(chunk)
assert checked_count == count and checked_digest.digest() == digest.digest()
record = dict(command=command, exitCode=status, elapsedSeconds=time.monotonic() - started,
              completeLog=str(target), rawBytes=count, rawSha256=digest.hexdigest(),
              compressedBytes=target.stat().st_size, completeReadback=True,
              interrupted=interrupted,
              stagesChanged=False, deadlinesChanged=False,
              scope='Logging only; a failed or interrupted gate never qualifies verification.')
with receipt.open('x') as output:
    json.dump(record, output)
print(json.dumps(record), flush=True)
raise SystemExit(status if status >= 0 else 128 - status)
