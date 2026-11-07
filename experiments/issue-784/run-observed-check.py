#!/usr/bin/env python3
"""Observe one task-owned check and stop only its process group near the cgroup cap.

This is a resource diagnostic, not a replacement for source-declared deadlines.
The caller selects complete test files and retains the full command output.
"""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--log', required=True, type=Path)
parser.add_argument('--receipt', required=True, type=Path)
parser.add_argument('command', nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ['--'] else args.command
if not command:
    parser.error('a complete check command is required')
limit = int(Path('/sys/fs/cgroup/memory.max').read_text())
threshold = limit - 256 * 1024 * 1024
memory = Path('/sys/fs/cgroup/memory.current')
if int(memory.read_text()) >= threshold:
    raise SystemExit('Insufficient current cgroup headroom; no child launched')
started = time.monotonic()
peak = samples = 0
stopped = False
with args.log.open('xb') as log:
    child = subprocess.Popen(
        ['python3', 'experiments/issue-784/with-child-reaper.py', *command],
        stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
    )
    while child.poll() is None:
        observed = int(memory.read_text())
        peak = max(peak, observed)
        samples += 1
        if observed >= threshold and not stopped:
            # Keep the subreaper alive to collect every owned descendant. The
            # direct command and its children share the new process group.
            # Signal group members individually, excluding that reaper.
            for process in Path('/proc').iterdir():
                if not process.name.isdecimal() or int(process.name) == child.pid:
                    continue
                try:
                    if os.getpgid(int(process.name)) == child.pid:
                        os.kill(int(process.name), signal.SIGTERM)
                except ProcessLookupError:
                    pass
            stopped = True
        time.sleep(0.1)
    status = child.wait()
receipt = {
    'command': command, 'pid': child.pid, 'exitCode': status,
    'elapsedSeconds': time.monotonic() - started,
    'containerLimitBytes': limit, 'stopThresholdBytes': threshold,
    'peakSampledCgroupBytes': peak, 'sampleIntervalSeconds': 0.1,
    'samples': samples, 'stopped': stopped,
    'scope': 'Total cgroup samples, not child RSS or a complete process peak.',
    'deadlineQualification': 'Original test deadlines remain independently required.',
}
with args.receipt.open('x') as target:
    json.dump(receipt, target)
    target.write('\n')
print(json.dumps(receipt))
raise SystemExit(status if status >= 0 else 128 - status)
