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
parser.add_argument('--reclaim-initial-gate-cache', action='store_true',
                    help='Once, pause only the initial gate fingerprint and advise inactive tracked pages')
parser.add_argument('command', nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ['--'] else args.command
if not command:
    parser.error('a complete check command is required')
if args.reclaim_initial_gate_cache and (len(command) != 3
        or command[1:] != ['--max-old-space-size=512', 'scripts/check-js-first-local.mjs']
        or Path(command[0]).name != 'node'
        or args.receipt.resolve().parent != Path.cwd() / 'ci-logs/issue-784-restart-2'):
    parser.error('cache advice is restricted to this task initial complete gate')
limit = int(Path('/sys/fs/cgroup/memory.max').read_text())
threshold = limit - 256 * 1024 * 1024
memory = Path('/sys/fs/cgroup/memory.current')
if int(memory.read_text()) >= threshold:
    raise SystemExit('Insufficient current cgroup headroom; no child launched')
started = time.monotonic()
peak = samples = 0
stopped = False
reclaims = []
interrupted = None


def request_stop(signum, _frame):
    global interrupted
    interrupted = signal.Signals(signum).name


signal.signal(signal.SIGINT, request_stop)
signal.signal(signal.SIGTERM, request_stop)
with args.log.open('xb') as log:
    child = subprocess.Popen(
        ['python3', 'experiments/issue-784/with-child-reaper.py', *command],
        stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
    )
    while child.poll() is None:
        observed = int(memory.read_text())
        peak = max(peak, observed)
        samples += 1
        if (observed >= threshold or interrupted) and not stopped:
            if (not interrupted and args.reclaim_initial_gate_cache
                    and not reclaims and args.log.stat().st_size == 0):
                # No stage has printed its mandatory opening line. Freeze the
                # new owned process group, then check that boundary again. This
                # cannot pause an already running compiler cohort or extend a
                # case deadline. Always continue before any termination signal.
                try:
                    os.killpg(child.pid, signal.SIGSTOP)
                except ProcessLookupError:
                    continue
                row = {'beforeBytes': observed, 'fileContentsChanged': False}
                reclaims.append(row)
                try:
                    boundary = args.log.stat().st_size == 0
                    row['initialFingerprintOnly'] = boundary
                    if boundary:
                        reclaim_receipt = args.receipt.with_name(args.receipt.stem + '-cache-reclaim.json')
                        reclaim_log = args.receipt.with_name(args.receipt.stem + '-cache-reclaim.log')
                        with reclaim_log.open('xb') as output:
                            result = subprocess.run([
                                'python3', 'experiments/issue-784/release-inactive-repository-pages.py',
                                '--receipt', str(reclaim_receipt),
                            ], stdout=output, stderr=subprocess.STDOUT)
                        row.update(exitCode=result.returncode, receipt=str(reclaim_receipt),
                                   log=str(reclaim_log))
                    row['afterBytes'] = int(memory.read_text())
                except Exception as error:
                    row['error'] = repr(error)
                finally:
                    try:
                        os.killpg(child.pid, signal.SIGCONT)
                    except ProcessLookupError:
                        pass
                if not interrupted and row.get('exitCode') == 0 and row['afterBytes'] < threshold:
                    continue
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
observer_status = (128 + signal.SIGTERM if (stopped or interrupted) and status == 0
                   else status if status >= 0 else 128 - status)
receipt = {
    'command': command, 'pid': child.pid, 'exitCode': observer_status, 'childExitCode': status,
    'elapsedSeconds': time.monotonic() - started,
    'containerLimitBytes': limit, 'stopThresholdBytes': threshold,
    'peakSampledCgroupBytes': peak, 'sampleIntervalSeconds': 0.1,
    'samples': samples, 'stopped': stopped,
    'initialFingerprintCacheAdvice': reclaims,
    'interrupted': interrupted,
    'scope': 'Total cgroup samples, not child RSS or a complete process peak.',
    'deadlineQualification': 'Original test deadlines remain independently required.',
}
with args.receipt.open('x') as target:
    json.dump(receipt, target)
    target.write('\n')
print(json.dumps(receipt))
raise SystemExit(observer_status)
