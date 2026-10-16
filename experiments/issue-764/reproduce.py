#!/usr/bin/env python3
"""Show the original empty outbox from the pre-marketplace implementation.

Extracts the original pure outbox builder and runs it with lightweight route
stubs. It deliberately fails the publication assertion on the original code.
Run after other Cargo processes finish to keep builds sequential.
"""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
source = subprocess.check_output(
    ['git', 'show', 'fa0169f0f:src/activitypub.rs'], cwd=root, text=True
)
start = source.index('pub fn outbox_document(')
end = source.index('\n///', start)
workspace = Path(__file__).resolve().parent / 'baseline'
(workspace / 'src').mkdir(parents=True, exist_ok=True)
(workspace / 'Cargo.toml').write_text('''[package]
name = "issue-764-baseline"
version = "0.0.0"
edition = "2024"
[dependencies]
serde_json = "1"
''')
(workspace / 'src/lib.rs').write_text('''use serde_json::{Value, json};
enum RouteId { ActivityPubOutbox }
fn activitypub_url(base: &str, _: RouteId) -> String {
    format!("{base}/api/services/activitypub/outbox/code")
}
fn activitypub_context() -> Value { json!("https://www.w3.org/ns/activitystreams") }
''' + source[start:end] + '''
#[test]
fn publishes_models_in_the_outbox() {
    let document = outbox_document("https://router.example");
    assert!(document["totalItems"].as_u64().unwrap() > 0,
        "legacy outbox always publishes zero models");
}
''')
result = subprocess.run(['cargo', 'test', '--manifest-path', str(workspace / 'Cargo.toml'), '-j', '1'], cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(result.stdout)
if result.returncode == 0 or 'legacy outbox always publishes zero models' not in result.stdout:
    raise SystemExit('Expected the legacy publication assertion to fail')
print('Confirmed: legacy outbox does not publish model services')
