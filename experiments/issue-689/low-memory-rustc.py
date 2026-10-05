#!/usr/bin/env python3
"""Local-only serial LLVM for the large router test crate on a 3 GB runner.

Keep normal codegen units and dependency artifacts; disable MIR optimization
only for this diagnostic test build. Production and CI builds remain on stable
flags. Python also preserves Cargo's environment variable
names containing hyphens, which POSIX shell wrappers discard.
"""
import os
import sys

compiler, *arguments = sys.argv[1:]
if "--test" in arguments and "link_assistant_router" in arguments:
    os.environ["RUSTC_BOOTSTRAP"] = "1"
    arguments = ["-Z", "no-parallel-backend", "-Z", "mir-opt-level=0", "-Z", "time-passes", *arguments]
os.execv(compiler, [compiler, *arguments])
