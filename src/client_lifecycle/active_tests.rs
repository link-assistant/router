//! Unit tests for [`super`]: which running process can write which profile.

use super::*;

fn known(line: &str) -> HashMap<String, PathBuf> {
    match parse_ps_environment(line) {
        Environment::Known(variables) => variables,
        Environment::Unknown(reason) => panic!("expected an environment: {reason}"),
    }
}

fn unknown(line: &str) -> String {
    match parse_ps_environment(line) {
        Environment::Known(variables) => panic!("expected no environment: {variables:?}"),
        Environment::Unknown(reason) => reason,
    }
}

#[test]
fn ps_environment_keeps_only_profile_variables_and_values_with_spaces() {
    let variables = known(
        "claude --resume abc TERM=xterm-256color HOME=/Users/A B \
         CLAUDE_CONFIG_DIR=/tmp/claude profile PATH=/usr/bin:/bin XDG_CONFIG_HOME=\n",
    );
    assert_eq!(variables["HOME"], PathBuf::from("/Users/A B"));
    assert_eq!(
        variables["CLAUDE_CONFIG_DIR"],
        PathBuf::from("/tmp/claude profile")
    );
    assert!(!variables.contains_key("PATH"));
    // Set-but-empty is unset, as for this process (issue #340).
    assert!(!variables.contains_key("XDG_CONFIG_HOME"));
}

#[test]
fn ps_environment_without_home_or_with_a_conflict_is_not_guessed() {
    // `ps -E` shows no environment for another user's process.
    assert!(unknown("claude --print hello").contains("not readable"));
    assert!(unknown("claude HOME=/tmp/fixture HOME=/Users/me").contains("HOME is ambiguous"));
    // Repeating the same value is not a conflict.
    assert_eq!(
        known("claude HOME=/Users/me HOME=/Users/me")["HOME"],
        PathBuf::from("/Users/me")
    );
}

fn claude_profile(home: &Path) -> Profile {
    Profile {
        client: ClientKind::ClaudeCode,
        scope: "normal",
        stores: vec![
            super::super::store("home", home.join(".claude")),
            super::super::store("legacy-settings", home.join(".claude.json")),
        ],
    }
}

fn environment(pairs: &[(&str, &Path)]) -> HashMap<String, PathBuf> {
    pairs
        .iter()
        .map(|(name, path)| ((*name).to_owned(), path.to_path_buf()))
        .collect()
}

#[test]
fn a_process_under_an_unrelated_home_does_not_write_a_fixture_profile() {
    let user = tempfile::tempdir().unwrap();
    let fixture = tempfile::tempdir().unwrap();
    let profile = claude_profile(fixture.path());
    let running = environment(&[("HOME", user.path())]);
    assert_eq!(written_store(&profile, &running).unwrap(), None);
    // A home nested inside the fixture is still a different profile.
    let nested = fixture.path().join("elsewhere");
    let running = environment(&[("HOME", &nested)]);
    assert_eq!(written_store(&profile, &running).unwrap(), None);
}

#[test]
fn a_process_writing_the_selected_profile_is_matched_by_home_or_override() {
    let user = tempfile::tempdir().unwrap();
    let fixture = tempfile::tempdir().unwrap();
    let profile = claude_profile(fixture.path());
    let same_home = environment(&[("HOME", fixture.path())]);
    assert_eq!(
        written_store(&profile, &same_home).unwrap(),
        Some(fixture.path().join(".claude").as_path())
    );
    let config = fixture.path().join(".claude");
    let redirected = environment(&[("HOME", user.path()), ("CLAUDE_CONFIG_DIR", &config)]);
    assert_eq!(
        written_store(&profile, &redirected).unwrap(),
        Some(config.as_path())
    );
}

#[test]
fn a_router_launched_client_blocks_the_router_profile_it_writes() {
    let user = tempfile::tempdir().unwrap();
    let owned = user
        .path()
        .join(".config/link-assistant-router/clients/gemini/home");
    let profile = Profile {
        client: ClientKind::GeminiCli,
        scope: "router",
        stores: vec![super::super::store("home", owned.clone())],
    };
    // `router with gemini` points both HOME and GEMINI_CLI_HOME at the store.
    let launched = environment(&[("HOME", &owned), ("GEMINI_CLI_HOME", &owned)]);
    assert!(written_store(&profile, &launched).unwrap().is_some());
    let other = tempfile::tempdir().unwrap();
    let unrelated = environment(&[("HOME", other.path())]);
    assert_eq!(written_store(&profile, &unrelated).unwrap(), None);
}

#[test]
fn a_relative_override_in_another_process_cannot_be_placed() {
    let user = tempfile::tempdir().unwrap();
    let profile = Profile {
        client: ClientKind::QwenCode,
        scope: "normal",
        stores: vec![super::super::store("home", user.path().join(".qwen"))],
    };
    let running = environment(&[("HOME", user.path()), ("QWEN_HOME", Path::new("relative"))]);
    let error = written_store(&profile, &running).unwrap_err();
    assert!(error.contains("QWEN_HOME is relative"), "{error}");
}

#[cfg(unix)]
#[test]
fn symlinked_roots_compare_as_the_same_place() {
    let real = tempfile::tempdir().unwrap();
    let links = tempfile::tempdir().unwrap();
    let alias = links.path().join("alias");
    std::os::unix::fs::symlink(real.path(), &alias).unwrap();
    assert!(overlaps(
        &alias.join(".claude"),
        &real.path().join(".claude")
    ));
    assert!(overlaps(&alias, &real.path().join(".claude/missing")));
    assert!(!overlaps(
        &alias.join(".codex"),
        &real.path().join(".claude")
    ));
}

fn still_named(answers: &[bool]) -> impl FnMut() -> Result<bool, String> + '_ {
    let mut answers = answers.iter();
    move || Ok(*answers.next().expect("asked more often than expected"))
}

#[test]
fn a_client_caught_while_it_execs_something_else_is_not_a_writer() {
    // Unreadable once, then no longer named like the client.
    let mut reads = 0;
    let settled = settle_environment(
        || {
            reads += 1;
            Some(Environment::Unknown("cannot read its environment".into()))
        },
        still_named(&[false]),
    )
    .unwrap();
    assert!(settled.is_none());
    assert_eq!(reads, 1);
    // Unreadable once, then readable under the same name.
    let mut first = true;
    let settled = settle_environment(
        || {
            if std::mem::take(&mut first) {
                Some(Environment::Unknown("cannot read its environment".into()))
            } else {
                Some(Environment::Known(HashMap::new()))
            }
        },
        still_named(&[true]),
    )
    .unwrap();
    assert!(matches!(settled, Some(Environment::Known(_))));
}

#[test]
fn a_client_that_stays_unreadable_is_still_reported() {
    let settled = settle_environment(
        || Some(Environment::Unknown("cannot read its environment".into())),
        still_named(&[true; SETTLE_ATTEMPTS]),
    )
    .unwrap();
    match settled {
        Some(Environment::Unknown(reason)) => assert!(reason.contains("cannot read")),
        _ => panic!("a persistently unreadable client must stay unknown"),
    }
}
