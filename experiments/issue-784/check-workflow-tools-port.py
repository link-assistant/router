#!/usr/bin/env python3
"""Issue #784: run scripts/check-workflow-tools.rs's main check without Rust.

A one-for-one port of `jobs`, `missing_installs` and `main`; the TOOLS table is
copied from the script. Run from the repository root.
Usage: python3 -I experiments/issue-784/check-workflow-tools-port.py
"""
import os
import sys

TOOLS = [
    ("rust-script", ["rust-script "], ["cargo install rust-script", "install-rust-script.sh"]),
    ("cargo-cyclonedx", ["cargo cyclonedx"], ["cargo install cargo-cyclonedx"]),
    ("cargo-audit", ["cargo audit"], ["cargo install cargo-audit"]),
    ("cargo-llvm-cov", ["cargo llvm-cov"], ["cargo install cargo-llvm-cov"]),
    ("cargo-fuzz", ["cargo +nightly fuzz", "cargo fuzz"], ["cargo install cargo-fuzz", "install cargo-fuzz"]),
    ("cargo-mutants", ["cargo mutants"], ["cargo install cargo-mutants"]),
    ("sccache", ["RUSTC_WRAPPER=sccache", "RUSTC_WRAPPER: sccache"], ["mozilla-actions/sccache-action@"]),
]


def jobs(text):
    out, in_jobs = [], False
    for i, line in enumerate(text.splitlines()):
        if not line.startswith(" ") and line.strip() and not line.startswith("#"):
            in_jobs = line.rstrip() == "jobs:"
            continue
        if not in_jobs:
            continue
        if line.startswith("  ") and not line.startswith("   ") and not line.lstrip().startswith("#") and line.rstrip().endswith(":"):
            out.append((line.strip().rstrip(":"), []))
        elif out:
            out[-1][1].append((i + 1, line))
    return out


comment = lambda l: l.lstrip().startswith("#")
failures, checked = [], 0
paths = sorted(p for p in os.listdir(".github/workflows") if p.endswith((".yml", ".yaml")))
for p in paths:
    for name, lines in jobs(open(".github/workflows/" + p, encoding="utf-8").read()):
        checked += 1
        for tool, uses, installs in TOOLS:
            def inst(l):
                s = l.lstrip()
                return any(m in l for m in installs) or (s.startswith("tool:") and any(x.strip().split("@")[0] == tool for x in s[5:].split(",")))
            first_install = next((n for n, l in lines if not comment(l) and inst(l)), None)
            probes = lambda l: any(f"{m.rstrip()} --version" in l for m in uses)
            use = next(((n, l) for n, l in lines if not comment(l) and not inst(l) and not probes(l) and any(m in l for m in uses)), None)
            if use and (first_install is None or first_install >= use[0]):
                failures.append(f"{p}: job `{name}` {tool} line {use[0]} install {first_install}: {use[1].strip()}")
print(f"{checked} jobs in {len(paths)} workflows")
for f in failures:
    print("Error:", f)
sys.exit(1 if failures else 0)
