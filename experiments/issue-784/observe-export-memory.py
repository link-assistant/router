"""Record this complete Bun export check and stop its owned process before exhaustion."""
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

pid = int(sys.argv[1])
process = Path('/proc') / str(pid)
expected = ['bun', '--smol', 'test',
            'tools/translation/test/static-storage-transport.test.mjs',
            'tools/translation/test/static-source-layout-storage.test.mjs',
            'tools/translation/test/static-source-storage-codec.test.mjs',
            'tools/translation/test/export-bundle.test.mjs']
if process.joinpath('cmdline').read_bytes().decode().strip('\0').split('\0') != expected:
    raise RuntimeError('Unexpected owned process')
identity = process.joinpath('stat').read_text().split()[21]
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
Path('ci-logs/restart-export-memory.json').write_text(json.dumps(receipt) + '\n')
print(json.dumps({key: value for key, value in receipt.items() if key != 'samples'}))
