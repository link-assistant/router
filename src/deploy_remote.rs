//! SSH transport for `router deploy --server`.
//!
//! The coordinator deliberately sends one target-side program through one SSH
//! session. The session owns the target lease for its whole lifetime, while a
//! random cookie inherited through the agent's environment identifies every
//! child which may still be changing deployment state.

use std::ffi::OsStr;
use std::io::Write as _;
use std::process::{Command, ExitCode, Stdio};

use base64::Engine as _;
use link_assistant_router::cli::DeployArgs;

const AGENT: &str = include_str!("deploy/remote_agent.sh");
const AGENT_LEASE_EXIT: i32 = 73;
const TRANSPORT_EXIT: u8 = 10;
const LEASE_EXIT: u8 = 11;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RemoteMode {
    Deploy,
    Status,
    Down,
}

impl RemoteMode {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Deploy => "deploy",
            Self::Status => "status",
            Self::Down => "down",
        }
    }
}

fn mode(args: &DeployArgs) -> Result<RemoteMode, String> {
    if args.down {
        if !args.yes {
            return Err(
                "`deploy --server --down` removes serving containers; rerun with --yes".to_string(),
            );
        }
        Ok(RemoteMode::Down)
    } else if args.status {
        Ok(RemoteMode::Status)
    } else {
        Ok(RemoteMode::Deploy)
    }
}

fn default_image() -> String {
    format!(
        "link-assistant-router-deploy:{}",
        link_assistant_router::VERSION
    )
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn public_name(target: &str) -> String {
    let target = target.strip_prefix("ssh://").unwrap_or(target);
    let host = target.rsplit_once('@').map_or(target, |(_, host)| host);
    if let Some(host) = host
        .strip_prefix('[')
        .and_then(|host| host.split_once(']').map(|(host, _)| host))
    {
        return host.to_string();
    }
    if host.matches(':').count() > 1 {
        return host.to_string();
    }
    host.split_once(':')
        .map_or(host, |(host, _)| host)
        .to_string()
}

fn remote_command(arguments: &[String]) -> String {
    let wrapper = concat!(
        "umask 077; ",
        "IFS= read -r router_secret_b64 || exit 64; ",
        // The sentinel prevents command substitution from stripping newline
        // bytes which are legitimately part of the configured secret.
        "TOKEN_SECRET=$({ printf %s \"$router_secret_b64\" | base64 -d || exit 64; printf x; }) || exit 64; ",
        "TOKEN_SECRET=${TOKEN_SECRET%x}; ",
        "export TOKEN_SECRET; ",
        "exec sh -s -- \"$@\""
    );
    let mut command = format!("sh -c {} sh", shell_quote(wrapper));
    for argument in arguments {
        command.push(' ');
        command.push_str(&shell_quote(argument));
    }
    command
}

fn agent_arguments(args: &DeployArgs, mode: RemoteMode, cookie: &str) -> Vec<String> {
    let (build_mode, build_value) = args.build.as_ref().map_or_else(
        || {
            if args.image.is_some() {
                ("pull", "")
            } else {
                ("release", "")
            }
        },
        |context| ("path", context.as_str()),
    );
    vec![
        mode.as_str().to_string(),
        cookie.to_string(),
        link_assistant_router::VERSION.to_string(),
        args.image.clone().unwrap_or_else(default_image),
        build_mode.to_string(),
        build_value.to_string(),
        args.root.clone().unwrap_or_default(),
        args.port.to_string(),
        args.public_port
            .map_or_else(String::new, |port| port.to_string()),
        public_name(args.server.as_deref().unwrap_or_default()),
    ]
}

fn mapped_exit_code(code: Option<i32>) -> ExitCode {
    match code {
        Some(0) => ExitCode::SUCCESS,
        Some(255) | None => ExitCode::from(TRANSPORT_EXIT),
        Some(AGENT_LEASE_EXIT) => ExitCode::from(LEASE_EXIT),
        Some(_) => ExitCode::from(1),
    }
}

fn mapped_exit(status: std::process::ExitStatus) -> ExitCode {
    mapped_exit_code(status.code())
}

const fn transported_secret(mode: RemoteMode, token_secret: &str) -> &str {
    if matches!(mode, RemoteMode::Deploy) {
        token_secret
    } else {
        ""
    }
}

fn validate(args: &DeployArgs, mode: RemoteMode) -> Result<(), String> {
    let target = args
        .server
        .as_deref()
        .filter(|target| !target.trim().is_empty())
        .ok_or("an SSH target is required")?;
    if target.contains(['\n', '\r', '\0']) {
        return Err("the SSH target contains an invalid character".to_string());
    }
    if args
        .root
        .as_deref()
        .is_some_and(|root| root.contains(['\n', '\r', '\0']))
        || args
            .build
            .as_deref()
            .is_some_and(|path| path.contains(['\n', '\r', '\0']))
    {
        return Err("a remote path contains an invalid character".to_string());
    }
    if mode == RemoteMode::Deploy {
        link_assistant_router::deploy::immutable_ref(
            args.image.as_deref().unwrap_or(&default_image()),
        )?;
    }
    Ok(())
}

/// Run the target-side deployment agent and preserve transport/lease identity.
fn run_with_ssh(args: &DeployArgs, token_secret: &str, ssh: &OsStr) -> ExitCode {
    let mode = match mode(args).and_then(|mode| {
        validate(args, mode)?;
        Ok(mode)
    }) {
        Ok(mode) => mode,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(2);
        }
    };
    if mode == RemoteMode::Deploy
        && let Err(error) = link_assistant_router::token_secret::ensure_real(token_secret)
    {
        eprintln!("error: {error}");
        eprintln!(
            "note: the secret is sent through SSH stdin and is never copied into command arguments."
        );
        return ExitCode::from(2);
    }
    let target = args.server.as_deref().expect("validated target");
    let cookie = uuid::Uuid::new_v4().simple().to_string();
    let remote = remote_command(&agent_arguments(args, mode, &cookie));
    let mut child = match Command::new(ssh)
        .args([
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=yes",
            "--",
            target,
            &remote,
        ])
        .stdin(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => {
            eprintln!("transport error: could not start OpenSSH: {error}");
            return ExitCode::from(TRANSPORT_EXIT);
        }
    };
    // Observation and removal do not need the signing secret at all. Besides
    // reducing exposure, this keeps the non-serving placeholder (which may
    // contain NUL) out of a shell variable on those paths.
    let encoded =
        base64::engine::general_purpose::STANDARD.encode(transported_secret(mode, token_secret));
    let write_result = child.stdin.take().map_or_else(
        || Err(std::io::Error::other("SSH stdin was not available")),
        |mut stdin| {
            writeln!(stdin, "{encoded}")?;
            stdin.write_all(AGENT.as_bytes())
        },
    );
    if let Err(error) = write_result {
        eprintln!("transport error: could not send the deployment agent: {error}");
        let _ = child.kill();
        let _ = child.wait();
        return ExitCode::from(TRANSPORT_EXIT);
    }
    let status = match child.wait() {
        Ok(status) => status,
        Err(error) => {
            eprintln!("transport error: could not wait for OpenSSH: {error}");
            return ExitCode::from(TRANSPORT_EXIT);
        }
    };
    let code = mapped_exit(status);
    if code == ExitCode::from(TRANSPORT_EXIT) {
        eprintln!("transport error: the SSH connection to {target} failed");
    } else if code == ExitCode::from(LEASE_EXIT) {
        eprintln!("lease error: target ownership could not be proved safely");
    }
    code
}

/// Run the target-side deployment agent and preserve transport/lease identity.
pub fn run(args: &DeployArgs, token_secret: &str) -> ExitCode {
    run_with_ssh(args, token_secret, OsStr::new("ssh"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args() -> DeployArgs {
        DeployArgs {
            server: Some("deploy@example.test".into()),
            status: false,
            down: false,
            yes: false,
            port: 8080,
            public_port: None,
            image: None,
            build: None,
            root: None,
        }
    }

    #[test]
    fn secrets_are_stdin_only_and_never_part_of_the_remote_command() {
        let args = args();
        let command = remote_command(&agent_arguments(&args, RemoteMode::Deploy, "cookie"));
        assert!(!command.contains("super-secret"));
        assert!(command.contains("read -r router_secret_b64"));
        assert!(!command.contains("StrictHostKeyChecking"));
    }

    #[test]
    fn every_non_secret_argument_is_shell_quoted() {
        let mut args = args();
        args.root = Some("/srv/a deployment's root".into());
        let command = remote_command(&agent_arguments(&args, RemoteMode::Deploy, "cookie"));
        assert!(
            command.contains("'/srv/a deployment'\"'\"'s root'"),
            "{command}"
        );
    }

    #[test]
    fn public_certificate_name_handles_ssh_uris_ports_and_ipv6() {
        assert_eq!(public_name("deploy@example.test:2222"), "example.test");
        assert_eq!(
            public_name("ssh://deploy@example.test:2222"),
            "example.test"
        );
        assert_eq!(public_name("deploy@[2001:db8::7]:2222"), "2001:db8::7");
        assert_eq!(public_name("2001:db8::7"), "2001:db8::7");
    }

    #[test]
    fn lease_and_transport_failures_have_distinct_public_codes() {
        assert_eq!(mapped_exit_code(Some(0)), ExitCode::SUCCESS);
        assert_eq!(mapped_exit_code(Some(255)), ExitCode::from(TRANSPORT_EXIT));
        assert_eq!(
            mapped_exit_code(Some(AGENT_LEASE_EXIT)),
            ExitCode::from(LEASE_EXIT)
        );
        assert_eq!(mapped_exit_code(Some(1)), ExitCode::from(1));
        assert_eq!(mapped_exit_code(None), ExitCode::from(TRANSPORT_EXIT));
    }

    #[test]
    fn status_is_read_only_and_down_requires_explicit_consent() {
        let mut args = args();
        args.status = true;
        assert_eq!(mode(&args), Ok(RemoteMode::Status));
        args.status = false;
        args.down = true;
        assert!(mode(&args).unwrap_err().contains("--yes"));
        args.yes = true;
        assert_eq!(mode(&args), Ok(RemoteMode::Down));
        assert_eq!(transported_secret(RemoteMode::Status, "secret"), "");
        assert_eq!(transported_secret(RemoteMode::Down, "secret"), "");
        assert_eq!(transported_secret(RemoteMode::Deploy, "secret"), "secret");
    }

    #[test]
    fn target_signals_exit_nonzero_before_cleanup_runs() {
        assert!(AGENT.contains("trap on_failure EXIT\ntrap 'exit 130' HUP INT TERM"));
        assert!(AGENT.contains("trap release_lease EXIT\ntrap 'exit 130' HUP INT TERM"));
        assert!(!AGENT.contains("trap on_failure EXIT HUP INT TERM"));
    }

    #[test]
    fn validation_rejects_ambiguous_targets_paths_and_moving_deploy_images() {
        let mut candidate = args();
        assert!(validate(&candidate, RemoteMode::Deploy).is_ok());

        candidate.server = None;
        assert_eq!(
            validate(&candidate, RemoteMode::Deploy).unwrap_err(),
            "an SSH target is required"
        );
        candidate.server = Some(" \t".into());
        assert_eq!(
            validate(&candidate, RemoteMode::Deploy).unwrap_err(),
            "an SSH target is required"
        );
        candidate.server = Some("host\ncommand".into());
        assert!(
            validate(&candidate, RemoteMode::Deploy)
                .unwrap_err()
                .contains("invalid character")
        );

        candidate.server = Some("host".into());
        candidate.root = Some("/srv/router\rwrong".into());
        assert!(
            validate(&candidate, RemoteMode::Deploy)
                .unwrap_err()
                .contains("remote path")
        );
        candidate.root = None;
        candidate.build = Some("/src\0wrong".into());
        assert!(
            validate(&candidate, RemoteMode::Deploy)
                .unwrap_err()
                .contains("remote path")
        );

        candidate.build = None;
        candidate.image = Some("example/router:latest".into());
        assert!(
            validate(&candidate, RemoteMode::Deploy)
                .unwrap_err()
                .contains("moving reference")
        );
        // Observation never resolves or changes an image, so a stale image
        // option cannot turn status into a mutating validation path.
        assert!(validate(&candidate, RemoteMode::Status).is_ok());
    }

    #[test]
    fn agent_arguments_cover_release_pull_and_target_path_builds() {
        let mut candidate = args();
        let release = agent_arguments(&candidate, RemoteMode::Deploy, "cookie");
        assert_eq!(&release[4..6], ["release", ""]);
        assert!(release[3].ends_with(link_assistant_router::VERSION));

        candidate.image = Some("example/router:1.2.3".into());
        candidate.public_port = Some(8443);
        candidate.root = Some("/srv/router".into());
        let pull = agent_arguments(&candidate, RemoteMode::Deploy, "cookie");
        assert_eq!(&pull[4..6], ["pull", ""]);
        assert_eq!(&pull[6..9], ["/srv/router", "8080", "8443"]);

        candidate.build = Some("/src/router".into());
        let path = agent_arguments(&candidate, RemoteMode::Deploy, "cookie");
        assert_eq!(&path[4..6], ["path", "/src/router"]);
    }

    #[cfg(unix)]
    fn fake_ssh(exit: i32) -> (tempfile::TempDir, std::path::PathBuf) {
        use std::os::unix::fs::PermissionsExt as _;

        let directory = tempfile::tempdir().unwrap();
        let executable = directory.path().join("ssh");
        std::fs::write(
            &executable,
            format!(
                "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$0.arguments\"\ncat > \"$0.input\"\nexit {exit}\n"
            ),
        )
        .unwrap();
        let mut permissions = std::fs::metadata(&executable).unwrap().permissions();
        permissions.set_mode(0o700);
        std::fs::set_permissions(&executable, permissions).unwrap();
        (directory, executable)
    }

    #[cfg(unix)]
    #[test]
    fn ssh_session_carries_only_the_secret_and_agent_on_stdin() {
        let (_directory, ssh) = fake_ssh(0);
        let secret = "operator-only-signing-secret";

        assert_eq!(
            run_with_ssh(&args(), secret, ssh.as_os_str()),
            ExitCode::SUCCESS
        );

        let arguments = std::fs::read_to_string(ssh.with_extension("arguments")).unwrap();
        assert!(arguments.contains("BatchMode=yes"));
        assert!(arguments.contains("StrictHostKeyChecking=yes"));
        assert!(arguments.contains("deploy@example.test"));
        assert!(!arguments.contains(secret));
        let input = std::fs::read(ssh.with_extension("input")).unwrap();
        let newline = input.iter().position(|byte| *byte == b'\n').unwrap();
        assert_eq!(
            &input[..newline],
            base64::engine::general_purpose::STANDARD
                .encode(secret)
                .as_bytes()
        );
        assert_eq!(&input[newline + 1..], AGENT.as_bytes());
    }

    #[cfg(unix)]
    #[test]
    fn ssh_process_status_preserves_transport_and_lease_identity() {
        for (remote, public) in [
            (255, TRANSPORT_EXIT),
            (AGENT_LEASE_EXIT, LEASE_EXIT),
            (9, 1),
        ] {
            let (_directory, ssh) = fake_ssh(remote);
            assert_eq!(
                run_with_ssh(&args(), "operator-secret", ssh.as_os_str()),
                ExitCode::from(public)
            );
        }
        let missing = std::path::Path::new("/definitely/missing/router-ssh");
        assert_eq!(
            run_with_ssh(&args(), "operator-secret", missing.as_os_str()),
            ExitCode::from(TRANSPORT_EXIT)
        );
    }

    #[cfg(unix)]
    #[test]
    fn status_and_down_open_ssh_without_transporting_a_signing_secret() {
        for remote_mode in [RemoteMode::Status, RemoteMode::Down] {
            let (_directory, ssh) = fake_ssh(0);
            let mut candidate = args();
            candidate.status = remote_mode == RemoteMode::Status;
            candidate.down = remote_mode == RemoteMode::Down;
            candidate.yes = candidate.down;
            let placeholder = link_assistant_router::token_secret::placeholder("read-only-test");

            assert_eq!(
                run_with_ssh(&candidate, &placeholder, ssh.as_os_str()),
                ExitCode::SUCCESS
            );
            let input = std::fs::read(ssh.with_extension("input")).unwrap();
            assert_eq!(input.first(), Some(&b'\n'));
            let arguments = std::fs::read_to_string(ssh.with_extension("arguments")).unwrap();
            assert!(arguments.contains(remote_mode.as_str()));
        }
    }

    #[test]
    fn run_refuses_invalid_modes_and_placeholder_secrets_before_ssh() {
        let missing = std::path::Path::new("/definitely/missing/router-ssh");
        let mut candidate = args();
        candidate.down = true;
        assert_eq!(
            run_with_ssh(&candidate, "operator-secret", missing.as_os_str()),
            ExitCode::from(2)
        );

        candidate.down = false;
        let placeholder = link_assistant_router::token_secret::placeholder("remote-test");
        assert_eq!(
            run_with_ssh(&candidate, &placeholder, missing.as_os_str()),
            ExitCode::from(2)
        );
    }
}
