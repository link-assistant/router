//! `router tls` — manage the certificate a self-signed deployment serves.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit.

use std::process::ExitCode;

use crate::config::Config;

/// Manage the self-signed certificate a private deployment serves.
#[must_use]
pub fn run(config: &Config, op: &crate::cli::TlsOp) -> ExitCode {
    run_in(std::path::Path::new(&config.data_dir), op)
}

/// The same command against an explicit data directory, so the behaviour can
/// be exercised without constructing a whole configuration.
#[must_use]
pub fn run_in(data_dir: &std::path::Path, op: &crate::cli::TlsOp) -> ExitCode {
    use crate::cli::TlsOp;
    let result = match op {
        TlsOp::Ca { .. } => {
            crate::tls::read_generated_certificate(data_dir).map(|pem| print!("{pem}"))
        }
        TlsOp::Generate { dns, .. } => {
            crate::tls::ensure_generated(data_dir, &crate::tls::generated_subject_names(dns))
                .map(|(cert, _)| println!("{}", cert.display()))
        }
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("error: {message}");
            ExitCode::from(1)
        }
    }
}
