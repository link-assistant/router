#!/usr/bin/env python3
"""Reduce the library test compiler's peak memory without rebuilding dependencies.

Run from the repository root:
  CARGO_BUILD_JOBS=1 CARGO_PROFILE_TEST_DEBUG=0 CARGO_PROFILE_DEV_DEBUG=0 \
    RUSTC_WRAPPER="$PWD/experiments/issue-723/bounded-unit-rustc.py" \
    cargo test --locked --all-features --lib

Cargo's one-job jobserver bounds concurrent code generation. This wrapper only
changes the monolithic library test crate; it leaves dependency compilation alone.
The existing container memory limit remains in effect as well.
"""
import os
import resource
import sys

args = sys.argv[1:]
if "--test" in args and "--crate-name" in args:
    name = args[args.index("--crate-name") + 1]
    if name == "link_assistant_router":
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_AS, (8 * 1024**3, 8 * 1024**3))
        resource.setrlimit(resource.RLIMIT_STACK, (32 * 1024**2, 32 * 1024**2))
        args.extend(["-C", "codegen-units=512"])
os.execvp(args[0], args)
