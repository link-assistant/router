//! The client token a local deployment issues, and its limits (issue #679).
//!
//! Every accepted candidate carries one unrevoked `deploy`-labelled client
//! token. `--token-*` flags (or `[tokens]` in `--config`) bound it: lifetime,
//! request and token caps, rate and the exact models it may request. Without
//! them it is issued exactly as before. The value is never printed.

use super::{Coordinator, LABEL_KEY, runtime_env};

impl Coordinator<'_> {
    pub(super) fn ensure_deploy_token(&self, backend: &str) {
        let present = self
            .docker
            .token_inventory(backend)
            .ok()
            .and_then(|rendered| {
                crate::operations::decode_token_inventory(rendered.as_bytes()).ok()
            })
            .is_some_and(|records| {
                records
                    .iter()
                    .any(|record| record.label == "deploy" && !record.revoked)
            });
        if !present {
            let policy = runtime_env::current().tokens.issue_arguments();
            let mut arguments = vec!["router", "tokens", "issue", "--label", "deploy"];
            arguments.extend(policy.iter().map(String::as_str));
            match self.docker.exec(backend, &arguments) {
                Ok(_) => println!("issued deploy client token (value withheld)"),
                Err(error) => println!("deploy client token skipped: {error}"),
            }
        }
    }

    /// The runtime environment fingerprint a backend was launched with.
    pub(super) fn runtime_env_label(&self, backend: &str) -> Option<String> {
        self.docker.label(
            backend,
            &format!("{LABEL_KEY}.{}", runtime_env::LABEL_SUFFIX),
        )
    }
}
