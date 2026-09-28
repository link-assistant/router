#!/usr/bin/env python3
"""Issue #610 follow-up: catch same-user processes named `claude` whose
/proc/<pid>/environ is briefly unreadable, and what they become next."""
import os, sys, time
name = sys.argv[1] if len(sys.argv) > 1 else "claude"
end = time.time() + float(sys.argv[2] if len(sys.argv) > 2 else 60)
seen = {}
while time.time() < end:
    for pid in os.listdir("/proc"):
        if not pid.isdigit():
            continue
        try:
            with open(f"/proc/{pid}/comm") as f:
                if f.read().strip() != name:
                    continue
            with open(f"/proc/{pid}/environ", "rb") as f:
                f.read()
        except PermissionError as error:
            time.sleep(0.05)
            try:
                after = open(f"/proc/{pid}/comm").read().strip()
            except OSError:
                after = "<exited>"
            seen.setdefault(pid, (str(error), after))
        except OSError:
            pass
for pid, (error, after) in seen.items():
    print(f"pid={pid} error={error} comm_after_50ms={after}")
print(f"unreadable same-name processes: {len(seen)}")
