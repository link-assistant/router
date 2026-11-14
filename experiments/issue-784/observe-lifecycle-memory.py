"""Observe only this attempt's Bun lifecycle process and stop before cgroup exhaustion."""
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

pid = int(sys.argv[1])
process = Path('/proc') / str(pid)
expected = ['bun', '--smol', 'test', 'tools/translation/test/static-source-lifecycle.test.mjs']
if process.joinpath('cmdline').read_bytes().decode().strip('\0').split('\0') != expected:
    raise RuntimeError('Unexpected owned process')
identity = process.joinpath('stat').read_text().split()[21]
parent = Path('/proc') / process.joinpath('stat').read_text().split()[3]
if 'experiments/issue-784/with-child-reaper.py' not in parent.joinpath('cmdline').read_bytes().decode():
    raise RuntimeError('Expected task-owned child reaper')
memory = Path('/sys/fs/cgroup/memory.current')
limit = int(Path('/sys/fs/cgroup/memory.max').read_text())
threshold = limit - 256 * 1024 * 1024
rows = []
while process.exists():
    try:
        state = process.joinpath('stat').read_text().split()
    except FileNotFoundError:
        break
    if state[21] != identity or state[2] == 'Z':
        break
    observed = int(memory.read_text())
    row = {'at': datetime.now(timezone.utc).isoformat(), 'cgroupBytes': observed}
    rows.append(row)
    if observed >= threshold:
        os.kill(pid, signal.SIGTERM)
        row['signal'] = 'SIGTERM'
        break
    time.sleep(0.1)
receipt = {'pid': pid, 'command': expected, 'containerLimitBytes': limit,
           'stopThresholdBytes': threshold, 'sampleIntervalSeconds': 0.1,
           'peakSampledCgroupBytes': max((row['cgroupBytes'] for row in rows), default=None),
           'scope': 'Total cgroup observations; not Bun RSS or a complete process peak.',
           'samples': rows}
Path('ci-logs/restart-static-lifecycle-memory.json').write_text(json.dumps(receipt) + '\n')
print(json.dumps({key: value for key, value in receipt.items() if key != 'samples'}))
