#!/usr/bin/env python3
"""Reduce workspace library compiler memory in a 3 GiB workspace.

Use for local verification, one Cargo command at a time:
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 \
CARGO_PROFILE_TEST_CODEGEN_UNITS=1024 \
RUSTC_WRAPPER="$PWD/experiments/issue-703/rustc_memory_wrapper.py" \
cargo test --locked --all-features --no-fail-fast

The original scheduling-only wrapper still exceeded this workspace's cap.
These additional flags remove LLVM names and MIR debug bookkeeping; they
preserve test logic, debug assertions and caller locations. CI uses the
ordinary compiler on runners with enough memory for the combined target.
"""
import os
from pathlib import Path
import sys
import time

arguments = sys.argv[1:]
if "link_assistant_router" in arguments:
    # Other issue workspaces share this cgroup. Opt in to waiting for their
    # compilers to finish, counting anonymous memory rather than file cache.
    limit = int(os.environ.get("ROUTER_LOCAL_MAX_BASELINE_ANON_BYTES", "0"))
    statistics = Path("/sys/fs/cgroup/memory.stat")
    announced = False
    while limit and statistics.exists():
        memory = dict(line.split() for line in statistics.read_text().splitlines())
        if int(memory["anon"]) <= limit:
            break
        if not announced:
            print("Waiting for shared compiler memory before local Router verification", file=sys.stderr)
            announced = True
        time.sleep(1)
    arguments += ["-Ccodegen-units=1024", "-Zno-parallel-backend", "-Zfewer-names=yes", "-Zmir-strip-debuginfo=all-locals"]
    os.environ["RUSTC_BOOTSTRAP"] = "1"
    os.environ["MALLOC_ARENA_MAX"] = "1"
    os.environ["MALLOC_TRIM_THRESHOLD_"] = "65536"
    os.environ["MALLOC_MMAP_THRESHOLD_"] = "65536"
os.execv(arguments[0], arguments)
