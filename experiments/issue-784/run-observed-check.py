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
parser.add_argument('--advise-closed-gate-pages', action='store_true',
                    help='Bounded asynchronous advice on closed tracked pages; original clocks keep running')
parser.add_argument('--advise-closed-production-pages', action='store_true',
                    help='Same bounded page advice for the complete canonical producer with 320 MiB old-space')
parser.add_argument('--advise-completed-fingerprint-pages', action='store_true',
                    help='Single pass over actual completed fingerprint prefixes; clocks and guard unchanged')
parser.add_argument('command', nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ['--'] else args.command
if not command:
    parser.error('a complete check command is required')
if (args.reclaim_initial_gate_cache or args.advise_closed_gate_pages or args.advise_completed_fingerprint_pages) and (len(command) != 3
        or command[1] not in ['--max-old-space-size=128', '--max-old-space-size=512']
        or command[2] != 'scripts/check-js-first-local.mjs'
        or Path(command[0]).name != 'node'
        or args.receipt.resolve().parent != Path.cwd() / 'ci-logs/issue-784-restart-2'):
    parser.error('cache advice is restricted to this task initial complete gate')
if args.advise_closed_production_pages and (command != [
        'node', '--max-old-space-size=320', 'scripts/translate-router.mjs', '--progress']
        or args.receipt.resolve().parent != Path.cwd() / 'ci-logs/issue-784-restart-2'):
    parser.error('production advice requires this task complete canonical producer and fixed heap')
if sum([args.reclaim_initial_gate_cache, args.advise_closed_gate_pages,
        args.advise_completed_fingerprint_pages, args.advise_closed_production_pages]) > 1:
    parser.error('choose one explicitly recorded file-cache experiment')
if args.advise_completed_fingerprint_pages and os.environ.get('ROUTER_JS_FIRST_FINGERPRINT_PROGRESS') != '1':
    parser.error('completed-prefix advice requires actual default-off fingerprint progress')
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
stop_sample = None
stop_seconds = None
stopped_processes = []
stopped_resources = []
closed_advice = []
adviser = None
adviser_output = None
fingerprint_adviser = None
fingerprint_output = None
fingerprint_advice = None


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
    if args.advise_completed_fingerprint_pages:
        advice_receipt = args.receipt.with_name(args.receipt.stem + '-completed-pages.json.gz')
        advice_log = args.receipt.with_name(args.receipt.stem + '-completed-pages.log')
        fingerprint_output = advice_log.open('xb')
        fingerprint_adviser = subprocess.Popen([
            'python3', '-B', 'experiments/issue-784/completed-fingerprint-pages.py',
            '--log', str(args.log), '--receipt', str(advice_receipt), '--owner-pid', str(child.pid),
        ], stdout=fingerprint_output, stderr=subprocess.STDOUT)
        fingerprint_advice = {'pid': fingerprint_adviser.pid, 'receipt': str(advice_receipt),
                              'log': str(advice_log), 'activeTestClocksPaused': False}
    while child.poll() is None:
        observed = int(memory.read_text())
        peak = max(peak, observed)
        samples += 1
        if adviser is not None and adviser.poll() is not None:
            closed_advice[-1].update(exitCode=adviser.wait(),
                                    finishedElapsedSeconds=time.monotonic() - started,
                                    afterBytes=int(memory.read_text()))
            adviser_output.close()
            adviser = adviser_output = None
        if ((args.advise_closed_gate_pages or args.advise_closed_production_pages)
                and not stopped and not interrupted
                and observed >= 2_300_000_000 and observed < threshold
                and adviser is None and len(closed_advice) < 12
                and (not closed_advice
                     or time.monotonic() - started - closed_advice[-1]['startedElapsedSeconds'] >= 3)):
            number = len(closed_advice) + 1
            prefix = args.receipt.stem + '-closed-pages-' + str(number)
            advice_receipt = args.receipt.with_name(prefix + '.json.gz')
            advice_log = args.receipt.with_name(prefix + '.log')
            adviser_output = advice_log.open('xb')
            adviser = subprocess.Popen([
                'python3', '-B', 'experiments/issue-784/release-inactive-repository-pages.py',
                '--receipt', str(advice_receipt), '--gzip-receipt',
                '--minimum-file-bytes', '131072',
            ], stdout=adviser_output, stderr=subprocess.STDOUT)
            closed_advice.append({'pid': adviser.pid, 'beforeBytes': observed,
                                  'startedElapsedSeconds': time.monotonic() - started,
                                  'receipt': str(advice_receipt), 'log': str(advice_log),
                                  'activeTestClocksPaused': False, 'sourceContentsChanged': False})
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
            # Keep the subreaper alive to collect every owned descendant.
            # Test daemons can detach into their own process group, but retain
            # this launcher's ancestry (or are adopted by its subreaper).
            stop_sample = observed
            stop_seconds = time.monotonic() - started
            parents = {}
            for process in Path('/proc').iterdir():
                if not process.name.isdecimal():
                    continue
                try:
                    fields = (process / 'stat').read_text().rsplit(')', 1)[1].split()
                    parents[int(process.name)] = (int(fields[1]), fields[19])
                except (FileNotFoundError, ProcessLookupError):
                    pass
            owned = {child.pid}
            while True:
                descendants = {pid for pid, (parent, _) in parents.items() if parent in owned}
                if descendants <= owned:
                    break
                owned.update(descendants)
            # Scalar, task-owned process observations only. Do not capture
            # command lines, environments, source text or another task's data.
            for pid in sorted(owned):
                try:
                    status_rows = dict(line.split(':', 1) for line in
                        Path(f'/proc/{pid}/status').read_text().splitlines() if ':' in line)
                    fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
                    identity = parents.get(pid)
                    if identity is None or fields[19] != identity[1]:
                        continue
                    stopped_resources.append({'pid': pid, 'parent': int(fields[1]),
                        'rssKiB': int(status_rows.get('VmRSS', '0 kB').split()[0]),
                        'peakRssKiB': int(status_rows.get('VmHWM', '0 kB').split()[0]),
                        'state': fields[0]})
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for pid in sorted(owned - {child.pid}):
                try:
                    # Refuse a recycled PID before signalling it.
                    fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
                    if fields[19] == parents[pid][1]:
                        os.kill(pid, signal.SIGTERM)
                        stopped_processes.append(pid)
                except (FileNotFoundError, ProcessLookupError):
                    pass
            stopped = True
        time.sleep(0.1)
    status = child.wait()
    if fingerprint_adviser is not None:
        fingerprint_advice.update(exitCode=fingerprint_adviser.wait())
        fingerprint_output.close()
    if adviser is not None:
        closed_advice[-1].update(exitCode=adviser.wait(),
                                finishedElapsedSeconds=time.monotonic() - started,
                                afterBytes=int(memory.read_text()))
        adviser_output.close()
observer_status = (128 + signal.SIGTERM if (stopped or interrupted) and status == 0
                   else status if status >= 0 else 128 - status)
receipt = {
    'command': command, 'pid': child.pid, 'exitCode': observer_status, 'childExitCode': status,
    'elapsedSeconds': time.monotonic() - started,
    'containerLimitBytes': limit, 'stopThresholdBytes': threshold,
    'peakSampledCgroupBytes': peak, 'sampleIntervalSeconds': 0.1,
    'samples': samples, 'stopped': stopped,
    'stopSampledCgroupBytes': stop_sample, 'stopElapsedSeconds': stop_seconds,
    'stoppedOwnedProcessIds': stopped_processes,
    'stoppedOwnedProcessResources': stopped_resources,
    'initialFingerprintCacheAdvice': reclaims,
    'completedFingerprintPageAdvice': fingerprint_advice,
    'closedTrackedPageAdvice': closed_advice,
    'closedTrackedPageAdvicePolicy': {'enabled': args.advise_closed_gate_pages or args.advise_closed_production_pages,
                                    'completeCanonicalProduction': args.advise_closed_production_pages,
                                    'thresholdBytes': 2_300_000_000,
                                    'minimumIntervalSeconds': 3, 'maximumInvocations': 12,
                                    'minimumTrackedFileBytes': 131072,
                                    'activeTestClocksPaused': False},
    'interrupted': interrupted,
    'scope': 'Total cgroup samples, not child RSS or a complete process peak.',
    'deadlineQualification': 'Original test deadlines remain independently required.',
}
with args.receipt.open('x') as target:
    json.dump(receipt, target)
    target.write('\n')
print(json.dumps(receipt))
raise SystemExit(observer_status)
