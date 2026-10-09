#!/usr/bin/env python3
"""Local-only unit-build experiment for the workspace's 3 GB memory limit.

Use as RUSTC_WRAPPER. Dependencies and production builds retain their normal
flags; only Router's large library test harness uses smaller codegen partitions
and reduced LLVM name retention. No runtime behavior or checked-in Cargo profile
changes. Requires a rustc supporting -Zfewer-names (tested with Rust 1.98.1).
"""
import os
import sys

compiler, *args = sys.argv[1:]
environment = os.environ.copy()
if "--test" in args and "--crate-name" in args:
    name = args[args.index("--crate-name") + 1]
    if name == "link_assistant_router":
        environment["RUSTC_BOOTSTRAP"] = "1"
        args.extend(["-Ccodegen-units=1024", "-Zfewer-names=yes"])
os.execvpe(compiler, [compiler, *args], environment)
