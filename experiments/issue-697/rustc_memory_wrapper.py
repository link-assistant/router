#!/usr/bin/env python3
"""Serialize the combined unit target's LLVM work in a 3 GiB workspace.

Use only for local verification:
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 \
CARGO_PROFILE_TEST_CODEGEN_UNITS=1024 \
RUSTC_WRAPPER="$PWD/experiments/issue-697/rustc_memory_wrapper.py" \
cargo test --locked --lib --all-features

The compiler's parallelism flag changes compilation scheduling, not test code.
CI uses the ordinary stable compiler with its larger memory budget.
"""
import os
import sys

arguments = sys.argv[1:]
if "--test" in arguments and "link_assistant_router" in arguments:
    arguments += ["-Zno-parallel-backend"]
    os.environ["RUSTC_BOOTSTRAP"] = "1"
    os.environ["MALLOC_ARENA_MAX"] = "1"
    os.environ["MALLOC_TRIM_THRESHOLD_"] = "65536"
    os.environ["MALLOC_MMAP_THRESHOLD_"] = "65536"
os.execv(arguments[0], arguments)
