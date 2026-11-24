"""Opt-in, finite call/time trace of the unmodified real adoption controller."""
import atexit
import hashlib
import json
import os
from pathlib import Path
import sys
import time

prefix = os.environ.get('ROUTER_784_CONTROLLER_PROFILE')
script = Path(sys.argv[0]).resolve() if sys.argv else None
if prefix and script and script.name == 'propose-core-adoption.py' and script.is_file():
    target = Path(prefix + '-' + str(os.getpid()) + '.jsonl')
    assert target.resolve().parent == Path.cwd() / 'ci-logs/issue-784-restart-2'
    stream = target.open('x', buffering=1)
    started = time.monotonic()
    last = started
    active, totals, calls = {}, {}, {}
    names = {'allocation', 'budget', 'retain', 'capture', 'require_current_capture',
             'write_prechild_source_bytes', 'retain_temp', 'output_index', 'main'}
    records = 0

    def report(event):
        global records
        records += 1
        if records > 128:
            sys.setprofile(None)
            stream.close()
            return
        stream.write(json.dumps(dict(event=event, seconds=time.monotonic() - started,
            calls=calls, inclusiveSeconds=totals, diagnosticOnly=True,
            originalDeadlineQualified=False)) + '\n')

    def profile(frame, event, _arg):
        global last
        name = frame.f_code.co_name
        if name not in names or frame.f_code.co_filename != str(script):
            return
        if event == 'call':
            active[id(frame)] = time.monotonic()
            calls[name] = calls.get(name, 0) + 1
        elif event == 'return':
            before = active.pop(id(frame), None)
            if before is not None:
                totals[name] = totals.get(name, 0) + time.monotonic() - before
        now = time.monotonic()
        if now - last >= 1:
            last = now
            report(event + ':' + name)

    stream.write(json.dumps(dict(script=str(script), sourceSha256=hashlib.sha256(script.read_bytes()).hexdigest(),
        profilerSource=str(Path(__file__).resolve()), pid=os.getpid(), argv=sys.argv,
        output=str(target), maximumRecords=128, diagnosticOnly=True)) + '\n')
    sys.setprofile(profile)

    def finish():
        sys.setprofile(None)
        if not stream.closed:
            report('atexit')
            if not stream.closed:
                stream.close()

    atexit.register(finish)
