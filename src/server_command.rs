//! CLI output layer for `router server`.

use std::io::Read as _;
use std::process::ExitCode;

use crate::cli::ServerOp;
use crate::managed_server::{
    PersistedServer, claim_managed, clear_persisted, managed_status, remove_managed,
    save_persisted_with_trust, start_managed, stop_managed,
};

type AnyError = Box<dyn std::error::Error + Send + Sync>;

#[must_use]
pub async fn run(op: &ServerOp) -> ExitCode {
    let result = match op {
        ServerOp::Use {
            server,
            management_server,
            ca_cert,
            management_ca_cert,
            token,
            token_stdin,
            clear,
            run_max_requests,
        } => configure(Selection {
            server: server.as_deref(),
            management_server: management_server.as_deref(),
            ca_cert: ca_cert.as_deref(),
            management_ca_cert: management_ca_cert.as_deref(),
            token: token.clone(),
            token_stdin: *token_stdin,
            clear: *clear,
            run_max_requests: *run_max_requests,
        }),
        ServerOp::Status => status().await,
        ServerOp::Start => start_managed().map(|url| {
            println!("managed router started at {url}");
        }),
        ServerOp::Claim => claim_managed().map(|token| {
            eprintln!(
                "The managed administrator is now claimed. Save this credential; future `with` runs require a token."
            );
            println!("{token}");
        }),
        ServerOp::Stop => stop_managed().map(|()| {
            println!("managed router stopped; container and volume were preserved");
        }),
        ServerOp::Remove { yes } => remove_managed(*yes).map(|()| {
            println!("removed the managed router container and credential volume");
        }),
        ServerOp::Reap { pid } => return crate::managed_server::reap(*pid),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

struct Selection<'a> {
    server: Option<&'a str>,
    management_server: Option<&'a str>,
    ca_cert: Option<&'a std::path::Path>,
    management_ca_cert: Option<&'a std::path::Path>,
    token: Option<String>,
    token_stdin: bool,
    clear: bool,
    run_max_requests: Option<u64>,
}

fn configure(selection: Selection<'_>) -> Result<(), AnyError> {
    let Selection {
        server,
        management_server,
        ca_cert,
        management_ca_cert,
        token,
        token_stdin,
        clear,
        run_max_requests,
    } = selection;
    if clear {
        if server.is_some()
            || management_server.is_some()
            || ca_cert.is_some()
            || management_ca_cert.is_some()
            || token.is_some()
            || token_stdin
            || run_max_requests.is_some()
        {
            return Err(
                "--clear cannot be combined with a server, token, CA certificate, or run budget"
                    .into(),
            );
        }
        let path = clear_persisted()?;
        println!("cleared persisted server selection at {}", path.display());
        return Ok(());
    }
    let server = server.ok_or("provide a server URL or use --clear")?;
    let token = if token_stdin {
        Some(read_token()?)
    } else {
        token
    };
    let path = save_persisted_with_trust(
        &PersistedServer {
            server: server.to_string(),
            management_server: management_server.map(str::to_string),
            token,
            run_max_requests,
            ca_cert: None,
            management_ca_cert: None,
        },
        ca_cert,
        management_ca_cert,
    )?;
    println!(
        "saved server selection in {} (token {})",
        path.display(),
        if crate::managed_server::load_persisted()?.is_some_and(|config| config.token.is_some()) {
            "set"
        } else {
            "unset"
        }
    );
    Ok(())
}

async fn status() -> Result<(), AnyError> {
    println!(
        "effective server: {}",
        crate::managed_server::effective_source().await?
    );
    println!("managed server: {}", managed_status()?);
    Ok(())
}

pub fn read_token() -> Result<String, AnyError> {
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input)?;
    let token = input.lines().next().unwrap_or_default().trim();
    if token.is_empty() {
        Err("standard input did not contain a token".into())
    } else {
        Ok(token.to_string())
    }
}
