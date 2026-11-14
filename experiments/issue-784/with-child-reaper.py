#!/usr/bin/env python3
"""Run unchanged checks with Linux orphan reaping when container PID 1 lacks it.

Only descendants of this launcher are adopted. No existing process is signalled,
no test selection or deadline is changed, and the direct command's exit status
is preserved. Linux's ordinary init process supplies this service on CI hosts.
"""
import ctypes
import os
import sys

if len(sys.argv) < 2:
    raise SystemExit("usage: with-child-reaper.py COMMAND [ARG ...]")
libc = ctypes.CDLL(None, use_errno=True)
if libc.prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER
    raise OSError(ctypes.get_errno(), "could not become child subreaper")
direct = os.fork()
if direct == 0:
    os.execvp(sys.argv[1], sys.argv[1:])
status = None
while True:
    try:
        child, observed = os.waitpid(-1, 0)
    except InterruptedError:
        continue
    except ChildProcessError:
        break
    if child == direct:
        status = os.waitstatus_to_exitcode(observed)
if status is None:
    raise SystemExit("direct command status missing")
raise SystemExit(status if status >= 0 else 128 - status)
