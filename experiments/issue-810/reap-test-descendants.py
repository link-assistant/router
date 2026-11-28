"""Run a test command in a Linux container whose PID 1 cannot reap daemons."""

import ctypes
import os
import subprocess
import sys


def main(command):
    if sys.platform != 'linux' or not command:
        raise SystemExit('Usage on Linux: reap-test-descendants.py COMMAND [ARG ...]')

    # Detached daemons become this process's children when their parents exit.
    # Reap them so signal-zero liveness tests see the same behavior as under init.
    libc = ctypes.CDLL(None, use_errno=True)
    set_child_subreaper = 36
    if libc.prctl(set_child_subreaper, 1, 0, 0, 0) != 0:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))

    child = subprocess.Popen(command)
    while True:
        pid, status = os.wait()
        if pid == child.pid:
            child.returncode = os.waitstatus_to_exitcode(status)
            return child.returncode if child.returncode >= 0 else 128 - child.returncode


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
