#!/usr/bin/env python3
"""Compile the public route enum and its existing compatibility regression alone.

This finite probe reproduces merge-order regressions without building Router.
The ordinary integration target also verifies these assertions with the crate.
"""
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
source = (root / 'src/route_contract_types.rs').read_text()
enum = re.search(r'pub enum RouteId \{[^}]*\}', source).group()
tests = (root / 'tests/model_catalog_compatibility_test.rs').read_text()
test = tests[tests.index('#[test]\nfn existing_route_ids'):]
probe = root / 'target/issue-727-route-ordinals.rs'
probe.write_text('#[derive(PartialEq, PartialOrd)]\n' + enum + '\n' + test)
binary = root / 'target/issue-727-route-ordinals'
subprocess.run(['rustc', '--test', str(probe), '-o', str(binary)], check=True)
subprocess.run([str(binary)], check=True)
