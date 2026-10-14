"""Measure one exact Bun test argv; this leaf does not change test deadlines."""
import json, os, re, signal, subprocess, sys, time
from pathlib import Path
try:
    import resource
except ImportError:
    resource = None

request = json.loads(Path(sys.argv[1]).read_text())
started = time.monotonic()
command = request['command']
cap = request['remainingMs'] / 1000
interrupted = False

def stop(_signum, _frame):
    global interrupted
    interrupted = True

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
with open(request['stdout'], 'xb') as out, open(request['stderr'], 'xb') as err:
    child = subprocess.Popen(command, cwd=request['root'], stdout=out, stderr=err,
                             start_new_session=True)
    Path(request['pidFile']).write_text(json.dumps({'pid': child.pid, 'processGroup': child.pid}))
    timed_out = False
    usage = None
    status = None
    if hasattr(os, 'wait4'):
        while status is None:
            pid, value, measured = os.wait4(child.pid, os.WNOHANG)
            if pid:
                status, usage = value, measured
                child.returncode = os.waitstatus_to_exitcode(status)
                break
            if interrupted or time.monotonic() - started >= cap:
                timed_out = True
                try: os.killpg(child.pid, signal.SIGTERM)
                except ProcessLookupError: pass
                end = time.monotonic() + 2
                while time.monotonic() < end:
                    pid, value, measured = os.wait4(child.pid, os.WNOHANG)
                    if pid:
                        status, usage = value, measured
                        child.returncode = os.waitstatus_to_exitcode(status)
                        break
                    time.sleep(0.02)
                if status is None:
                    try: os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError: pass
                    _, status, usage = os.wait4(child.pid, 0)
                    child.returncode = os.waitstatus_to_exitcode(status)
                break
            time.sleep(0.02)
    else:
        while child.poll() is None:
            if interrupted or time.monotonic() - started >= cap:
                timed_out = True
                try: os.killpg(child.pid, signal.SIGTERM)
                except (ProcessLookupError, AttributeError): child.terminate()
                try: child.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    try: os.killpg(child.pid, signal.SIGKILL)
                    except (ProcessLookupError, AttributeError): child.kill()
                    child.wait()
                break
            time.sleep(0.02)
    # Any unfinished descendants belong to this leaf's new session. Never
    # permit one file's background children to overlap the next test file.
    try: os.killpg(child.pid, signal.SIGKILL)
    except (ProcessLookupError, AttributeError): pass
version_header = None
for log_path in [request['stdout'], request['stderr']]:
    with open(log_path, 'rb') as log:
        header = re.search(rb'bun test v([^\s]+)', log.read(256))
    if header:
        version_header = {'version': header.group(1).decode('utf-8', errors='replace'),
                          'rawHeader': header.group(0).decode('utf-8', errors='replace'),
                          'source': 'observed raw Bun test header; not independently executed version probe'}
        break
own_usage = None if resource is None else resource.getrusage(resource.RUSAGE_SELF)
record = {'command': command, 'exitCode': child.returncode, 'timedOut': timed_out,
          'elapsedSeconds': time.monotonic() - started,
          'maxWaitedBunRssBytes': None if usage is None else usage.ru_maxrss * (1 if sys.platform == 'darwin' else 1024),
          'userCpuSeconds': None if usage is None else usage.ru_utime,
          'systemCpuSeconds': None if usage is None else usage.ru_stime,
          'resourceScope': 'wait4 for this Bun child including its waited descendants; not aggregate concurrent RSS or coordinator memory' if usage is not None else 'wait4 unavailable; child resource observations are null',
          'bunReportedVersion': version_header,
          'coordinatorResourcesIncluded': False,
          'processGroupCleanupSupported': hasattr(os, 'killpg'),
          'measurementCoordinator': {
              'pythonVersion': sys.version,
              'method': 'Python RUSAGE_SELF; separate from waited Bun resources' if own_usage is not None else 'resource unavailable',
              'maxRssBytes': None if own_usage is None else own_usage.ru_maxrss * (1 if sys.platform == 'darwin' else 1024),
              'userCpuSeconds': None if own_usage is None else own_usage.ru_utime,
              'systemCpuSeconds': None if own_usage is None else own_usage.ru_stime}}
Path(request['resourceFile']).write_text(json.dumps(record, indent=2) + '\n')
sys.exit(0)
