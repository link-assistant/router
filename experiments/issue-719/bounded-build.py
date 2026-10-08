#!/usr/bin/env python3
"""Run a Cargo validation command without exhausting a small Linux workspace.

Uses one build job/CPU, omits debug information, and stops the command's process
group if a child exceeds 2000 MiB RSS. Exit 125 means the memory bound prevented
completion; it is not a test failure. Other exits preserve the command's result.
"""

import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def main() -> int:
    if len(sys.argv) < 2 or not hasattr(os, "sched_getaffinity"):
        sys.exit("usage (Linux): bounded-build.py cargo <validation arguments>")
    os.sched_setaffinity(0, {min(os.sched_getaffinity(0))})
    environment = os.environ.copy()
    environment.update(CARGO_BUILD_JOBS="1", CARGO_PROFILE_DEV_DEBUG="0", MALLOC_ARENA_MAX="2")
    command = subprocess.Popen(
        sys.argv[1:], cwd=Path(__file__).resolve().parents[2],
        env=environment, start_new_session=True,
    )
    peak_kib = 0
    try:
        while command.poll() is None:
            for process in Path("/proc").iterdir():
                if not process.name.isdigit():
                    continue
                try:
                    fields = (process / "stat").read_text().rsplit(")", 1)[1].split()
                    if int(fields[2]) != command.pid:
                        continue
                    status = (process / "status").read_text().splitlines()
                    rss_kib = next(
                        (int(line.split()[1]) for line in status if line.startswith("VmRSS:")), 0,
                    )
                except (OSError, ValueError, IndexError):
                    continue
                peak_kib = max(peak_kib, rss_kib)
                if rss_kib > 2000 * 1024:
                    print(f"Memory bound reached: PID {process.name}, RSS {rss_kib} KiB", flush=True)
                    os.killpg(command.pid, signal.SIGKILL)
                    command.wait()
                    return 125
            time.sleep(0.25)
        print(f"Largest child RSS observed: {peak_kib} KiB", flush=True)
        return command.returncode
    finally:
        if command.poll() is None:
            os.killpg(command.pid, signal.SIGKILL)
            command.wait()


if __name__ == "__main__":
    raise SystemExit(main())
