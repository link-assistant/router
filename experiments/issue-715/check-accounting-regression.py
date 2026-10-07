#!/usr/bin/env python3
"""Prove deterministic scan assertions reject an always-rescan mutation.

Compile only the real accounting module, plus finite fixture tests. Generated
copies stay under target; repository production sources are never mutated.
"""
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'target/issue-715-accounting'
OUTPUT.mkdir(parents=True, exist_ok=True)
(ROOT / 'ci-logs').mkdir(exist_ok=True)
source = (ROOT / 'src/request_log/total_limit.rs').read_text()
condition = 'if cached.as_ref().is_none_or(|state| state.root_changed(root)) {'
assert source.count(condition) == 1
for name, text, succeeds in [
    ('original', source, True),
    ('always-rescan', source.replace(condition, 'if true {'), False),
]:
    module = OUTPUT / f'{name}-module.rs'
    module.write_text(text)
    test = OUTPUT / f'{name}.rs'
    test.write_text('''//! ```cargo
//! [dependencies]
//! tracing = "0.1"
//! tempfile = "3"
//! ```
const LOG_FILE: &str = "requests.lino";
const LEGACY_LOG_FILE: &str = "requests.jsonl";
#[path = "''' + str(module) + '''"]
mod accounting;
fn main() {}
#[test]
fn bounded_appends_do_not_rescan_other_tokens() {
    let root = tempfile::tempdir().unwrap();
    let active = root.path().join("active");
    std::fs::create_dir(&active).unwrap();
    let log = active.join(LOG_FILE);
    std::fs::write(&log, b"record").unwrap();
    let cache = std::sync::Mutex::new(None);
    accounting::enforce(root.path(), 4096, "active", &cache);
    let scans = cache.lock().unwrap().as_ref().unwrap().full_scans;
    for length in 1..=16 {
        std::fs::write(&log, vec![b'x'; length]).unwrap();
        accounting::enforce(root.path(), 4096, "active", &cache);
    }
    let cache = cache.lock().unwrap();
    let state = cache.as_ref().unwrap();
    assert_eq!(state.full_scans, scans, "bounded append rescanned the store");
    assert_eq!(state.accounted_bytes(), 16);
}
''')
    log = ROOT / 'ci-logs' / f'accounting-{name}.log'
    with log.open('w') as output:
        result = subprocess.run(['rust-script', '--test', str(test)], cwd=ROOT,
                                env={**os.environ, 'RUST_LOG': 'warn'},
                                stdout=output, stderr=output)
    assert (result.returncode == 0) == succeeds, f'unexpected result: {log}'
    if not succeeds:
        assert 'bounded append rescanned the store' in log.read_text(), log
    print(f'{name}: {"passes" if succeeds else "rejected by scan assertion"}', flush=True)
