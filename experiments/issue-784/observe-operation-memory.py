"""Stop only the owned operation-source Bun check before cgroup exhaustion."""
import json
import os
import signal
import sys
import time
from pathlib import Path

parent = Path('/proc') / str(int(sys.argv[1]))
if 'experiments/issue-784/with-child-reaper.py' not in parent.joinpath('cmdline').read_bytes().decode():
    raise RuntimeError('Expected owned task reaper')
expected = ['bun', '--smol', 'test',
            'tools/translation/test/operation-proof-byte-source-evolution.test.mjs',
            'tools/translation/test/operation-proof-byte-scope.test.mjs']
process = None
while parent.exists() and process is None:
    children = parent.joinpath('task', parent.name, 'children')
    if not children.exists():
        break
    for child in children.read_text().split():
        candidate = Path('/proc') / child
        try:
            command = candidate.joinpath('cmdline').read_bytes().decode().strip('\0').split('\0')
        except FileNotFoundError:
            continue
        if command == expected:
            process = candidate
    if process is None:
        time.sleep(0.1)
if process is None:
    raise RuntimeError('Owned Bun child not observed')
identity = process.joinpath('stat').read_text().split()[21]
limit = int(Path('/sys/fs/cgroup/memory.max').read_text())
threshold = limit - 256 * 1024 * 1024
peak = count = 0
stopped = False
while process.exists():
    try:
        state = process.joinpath('stat').read_text().split()
    except FileNotFoundError:
        break
    if state[21] != identity or state[2] == 'Z':
        break
    observed = int(Path('/sys/fs/cgroup/memory.current').read_text())
    peak = max(peak, observed)
    count += 1
    if observed >= threshold:
        os.kill(int(process.name), signal.SIGTERM)
        stopped = True
        break
    time.sleep(0.1)
receipt = {'pid': int(process.name), 'command': expected,
           'containerLimitBytes': limit, 'stopThresholdBytes': threshold,
           'peakSampledCgroupBytes': peak, 'samples': count,
           'sampleIntervalSeconds': 0.1, 'stopped': stopped,
           'scope': 'Total cgroup observations, not Bun RSS or a complete process peak.'}
Path('ci-logs/issue-784-restart-2/operation-bun-memory.json').write_text(json.dumps(receipt) + '\n')
print(json.dumps(receipt))
