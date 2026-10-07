#!/usr/bin/env python3
"""Compile exact baseline/current host classification with synthetic process output.

Only platform cfg and dependencies are substituted; no security child starts.
The old method must fail the same presence/profile assertion the fixed helper
passes. Generated Rust stays under target, this reusable driver is retained.
"""
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'target/issue-715-presence'
OUT.mkdir(parents=True, exist_ok=True)
old = subprocess.check_output(['git', 'show', 'd7f602b:src/deploy_local/host_runtime.rs'], cwd=ROOT, text=True)
body = old.split('    fn claude_login(&self) -> ClaudeLogin {', 1)[1].split('\n    fn token_inventory', 1)[0].strip()
old_function = 'fn classify() -> ClaudeLogin {' + body
new = (ROOT/'src/deploy_local/host_runtime.rs').read_text()
new_function = 'fn claude_login_in(' + new.split('fn claude_login_in(', 1)[1].split('\n#[cfg(test)]', 1)[0]
platform = (ROOT/'src/platform_keychain.rs').read_text().replace('#[cfg(target_os = "macos")]', '').replace('#[cfg(not(target_os = "macos"))]', '#[cfg(any())]').replace('cfg!(target_os = "macos")', 'true')
(OUT/'platform.rs').write_text(platform)
common = r'''#!/usr/bin/env rust-script
//! ```cargo
//! [dependencies]
//! sha2 = "0.11"
//! hex = "0.4"
//! tracing = "0.1"
//! ```
extern crate self as link_assistant_router;
#[derive(Debug, PartialEq)] enum ClaudeLogin { Keychain, File, Absent }
mod subscription { #[derive(Clone, Copy)] pub enum SubscriptionProvider { Claude, Codex } }
mod env_paths {
 pub fn from_value(value: Option<std::ffi::OsString>) -> Option<std::path::PathBuf> { value.filter(|s| !s.is_empty()).map(Into::into) }
 pub fn directory(name: &str) -> Option<std::path::PathBuf> { from_value(std::env::var_os(name)) }
}
mod operation_context {
 pub fn command(program: &str) -> std::process::Command { std::process::Command::new(program) }
 pub fn process_output(command: &mut std::process::Command) -> std::io::Result<std::process::Output> {
  use std::os::unix::process::ExitStatusExt;
  let args: Vec<_> = command.get_args().map(|a| a.to_string_lossy().into_owned()).collect();
  println!("synthetic security argv: {args:?}");
  let found = args.iter().any(|s| s == "Claude Code-credentials");
  Ok(std::process::Output { status: std::process::ExitStatus::from_raw(if found { 0 } else { 256 }), stdout: if found { b"synthetic default profile".to_vec() } else { vec![] }, stderr: vec![] })
 }
}
#[path = "platform.rs"] mod platform_keychain;
'''
with tempfile.TemporaryDirectory(prefix='issue-715-profile-') as temporary:
    Path(temporary, '.credentials.json').write_text('presence only, not parsed')
    env = {**os.environ, 'CLAUDE_CONFIG_DIR': temporary, 'HOME': temporary, 'RUSTUP_HOME': os.environ.get('RUSTUP_HOME', str(Path.home()/'.rustup')), 'CARGO_HOME': os.environ.get('CARGO_HOME', str(Path.home()/'.cargo'))}
    for label, function, expression, expected in [
        ('before', old_function, 'classify()', 1),
        ('after', new_function, 'claude_login_in(std::env::var_os("CLAUDE_CONFIG_DIR"), std::env::var_os("HOME"), platform_keychain::has_entry)', 0)]:
        source = OUT/f'{label}.rs'
        source.write_text(common + function + '\nfn main() { let login = '+expression+'; println!("login={login:?}"); assert_eq!(login, ClaudeLogin::File); }\n')
        with (ROOT/f'ci-logs/host-presence-{label}.log').open('w') as log:
            result = subprocess.run(['rust-script', str(source)], env=env, cwd=ROOT, stdout=log, stderr=log)
        # rust-script reports a panic using 101, nonzero compile errors do not
        # count as a reproduction: require the actual method's output.
        output = (ROOT/f'ci-logs/host-presence-{label}.log').read_text()
        assert ('login=Keychain' if label == 'before' else 'login=File') in output, output[-2000:]
        assert (result.returncode != 0) if expected else (result.returncode == 0)
        print(label, [s for s in output.splitlines() if s.startswith(('synthetic security', 'login='))], flush=True)
