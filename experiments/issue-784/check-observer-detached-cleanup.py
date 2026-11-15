"""Finite control for task-only observer cleanup; no Router test is replaced."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
ready = base / 'observer-detached-control.ready.json'
receipt = base / 'observer-detached-control.memory.json'
log = base / 'observer-detached-control.log'
assert not any(path.exists() for path in [ready, receipt, log])
script = "\n".join([
    'import json, os, subprocess, sys, time',
    "daemon=subprocess.Popen([sys.executable,'-c','import time; time.sleep(20)'],start_new_session=True)",
    f"with open({str(ready)!r},'x') as stream: json.dump(dict(parent=os.getpid(),daemon=daemon.pid),stream)",
    'daemon.wait()',
])
observer = subprocess.Popen([
    sys.executable, str(root / 'experiments/issue-784/run-observed-check.py'),
    '--log', str(log), '--receipt', str(receipt), '--', sys.executable, '-c', script,
], cwd=root)
started = time.monotonic()
while not ready.exists() and observer.poll() is None and time.monotonic() - started < 5:
    time.sleep(0.02)
assert ready.exists(), 'finite control child must become ready'
children = json.loads(ready.read_bytes())
assert os.getpgid(children['daemon']) == children['daemon']
os.kill(observer.pid, signal.SIGTERM)
status = observer.wait()
result = json.loads(receipt.read_bytes())
assert status == 143 and result['interrupted'] == 'SIGTERM' and result['stopped']
assert set(children.values()) <= set(result['stoppedOwnedProcessIds'])
assert all(not Path(f'/proc/{pid}').exists() for pid in [result['pid'], *children.values()])
assert result['stopSampledCgroupBytes'] > 0 and result['stopElapsedSeconds'] >= 0
print(json.dumps({'passed': True, 'detachedDaemonReaped': True, 'originalRouterTestsRun': False}))
