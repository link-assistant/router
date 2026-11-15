#!/usr/bin/env python3
"""Stream one task check's complete output into a fresh gzip, preserving status."""
import gzip
import json
from pathlib import Path
import signal
import subprocess
import sys
import zlib

if len(sys.argv) < 4 or sys.argv[2] != '--':
    raise SystemExit('usage: capture-compressed-check.py TASK_LOG.gz -- COMMAND ...')
target = Path(sys.argv[1])
if target.parent != Path('ci-logs/issue-784-restart-2') or target.suffix != '.gz':
    raise SystemExit('One fresh task compressed log required')
child = None
interrupted = None


def stop(signum, _frame):
    global interrupted
    interrupted = signal.Signals(signum).name
    if child is not None:
        try:
            child.send_signal(signum)
        except ProcessLookupError:
            pass


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
count = 0
with target.open('xb') as raw, gzip.GzipFile(fileobj=raw, mode='wb', mtime=0) as output:
    child = subprocess.Popen(sys.argv[3:], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    with child.stdout:
        while chunk := child.stdout.read1(65536):
            output.write(chunk)
            output.flush(zlib.Z_SYNC_FLUSH)
            count += len(chunk)
    code = child.wait()
status = code if code >= 0 else 128 - code
print(json.dumps({'path': str(target), 'logicalBytes': count,
                  'exitCode': status, 'interrupted': interrupted}))
raise SystemExit(status)
