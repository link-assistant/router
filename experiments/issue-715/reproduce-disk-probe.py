#!/usr/bin/env python3
"""Exercise the actual staging disk probe with the recorded CI shell timeout.

The baseline must fail; after removing the shell dependency the same assertion
must pass. Generated Rust stays under target and no subprocess is started by
the injected probe runner.
"""
import argparse
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'target/issue-715-disk-probe'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline', action='store_true')
args = parser.parse_args()
source = (subprocess.check_output(
    ['git', 'show', '636f49c:src/deploy_local/staging.rs'], cwd=ROOT, text=True
) if args.baseline else (ROOT / 'src/deploy_local/staging.rs').read_text())
probe = source[source.index('fn free_disk('):source.index('\nfn arguments(')]
script = OUT / ('baseline.rs' if args.baseline else 'fixed.rs')
script.write_text('''//! ```cargo
//! [dependencies]
//! fs2 = "0.4"
//! tempfile = "3"
//! ```
use std::path::Path;
use std::time::Duration;
mod operation_context {
    pub fn command(program: &str) -> std::process::Command {
        std::process::Command::new(program)
    }
    pub fn bounded_output(_: &mut std::process::Command, _: std::time::Duration)
        -> std::io::Result<std::process::Output> {
        Err(std::io::Error::new(std::io::ErrorKind::TimedOut,
            "diagnostic deadline exceeded"))
    }
    pub fn var_os(_: &str) -> Option<std::ffi::OsString> { None }
}
''' + probe + '''
fn main() {}
#[test]
fn disk_capacity_does_not_depend_on_a_shell_starting() {
    let root = tempfile::tempdir().unwrap();
    let result = free_disk(&root.path().canonicalize().unwrap());
    assert!(result.is_ok(), "shell startup prevented disk capacity: {result:?}");
}
''')
log = ROOT / 'ci-logs' / ('disk-probe-baseline.log' if args.baseline else 'disk-probe-fixed.log')
with log.open('w') as output:
    result = subprocess.run(['rust-script', '--test', str(script)], cwd=ROOT,
                            stdout=output, stderr=output)
assert (result.returncode != 0) == args.baseline, f'unexpected result: {log}'
if args.baseline:
    assert 'diagnostic deadline exceeded' in log.read_text(), log
print('baseline reproduced shell timeout' if args.baseline else 'native probe passed without a shell')
