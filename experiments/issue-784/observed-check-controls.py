#!/usr/bin/env python3
"""Finite launch/refusal/cancellation controls for this task resource observer."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
observer = root / 'experiments/issue-784/run-observed-check.py'
output = directory / 'named-host-observer-controls.json'
if output.exists():
    raise RuntimeError('Fresh complete control receipt required')
results = []
with tempfile.TemporaryDirectory(prefix='.observer-controls-', dir=observer.parent) as temporary:
    temporary = Path(temporary)
    for name in ['refuse', 'ordinary', 'cancel']:
        log, receipt = temporary / (name + '.log'), temporary / (name + '.json')
        command = [sys.executable, str(observer), '--log', str(log), '--receipt', str(receipt)]
        if name == 'refuse':
            command += ['--reclaim-initial-gate-cache']
        marker = temporary / 'child-started'
        program = ('print("unchanged child output")' if name != 'cancel' else
                   'from pathlib import Path; import time; Path(' + repr(str(marker))
                   + ').write_text("started"); time.sleep(5)')
        command += ['--', sys.executable, '-c', program]
        child = subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if name == 'cancel':
            # Five seconds is the child's finite workload, never an adjusted
            # compiler/test deadline. Also surface an early observer refusal.
            while not marker.exists() and child.poll() is None:
                time.sleep(0.01)
            if marker.exists():
                child.send_signal(signal.SIGTERM)
        raw = child.communicate()[0]
        row = {'name': name, 'command': command, 'exitCode': child.returncode,
               'completeOutput': raw.decode(), 'receipt': json.loads(receipt.read_text())
               if receipt.exists() else None, 'completeChildLog': log.read_text() if log.exists() else None}
        results.append(row)
        if name == 'refuse':
            assert child.returncode == 2 and row['receipt'] is None and not log.exists()
        else:
            assert row['receipt']['initialFingerprintCacheAdvice'] == []
            assert row['receipt']['interrupted'] == ('SIGTERM' if name == 'cancel' else None)
            assert child.returncode == (143 if name == 'cancel' else 0)
            if name == 'ordinary':
                assert row['completeChildLog'] == 'unchanged child output\n'
            try:
                os.killpg(row['receipt']['pid'], 0)
            except ProcessLookupError:
                row['ownedGroupGone'] = True
            else:
                raise AssertionError('Owned child group survived observer completion')
with output.open('x') as stream:
    json.dump({'controls': results, 'allPassed': True,
               'scope': 'Finite observer controls only; no full-gate qualification.'}, stream, indent=2)
    stream.write('\n')
print(json.dumps({'controls': len(results), 'allPassed': True, 'receipt': str(output)}))
