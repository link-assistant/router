//! `auth` and `tls` command definitions.
//!
//! Split from `cli.rs` to keep that file within the repository's 1000-line
//! limit.

use clap::Subcommand;

use super::{AuthFlow, CLAUDE_AUTH_FLOWS, CODEX_AUTH_FLOWS, auth_flow_parser};

/// A login this machine already holds that the router can adopt.
///
/// Not `SubscriptionProvider`: that enum is about subscriptions the proxy
/// serves models from, and GitHub is a credential the router presents upstream
/// rather than a subscription. Import spans both, so it needs a name for the
/// union (issue #278).
#[derive(Clone, Copy, Debug, Eq, PartialEq, clap::ValueEnum)]
pub enum ImportProvider {
    #[value(name = "claude", alias = "anthropic")]
    Claude,
    #[value(name = "codex", alias = "chatgpt")]
    Codex,
    #[value(name = "gemini", alias = "google")]
    Gemini,
    #[value(name = "qwen", alias = "qwen-code")]
    Qwen,
    #[value(name = "gh", alias = "github")]
    Gh,
}

/// Provider authorization operations.
#[derive(Debug, Subcommand)]
pub enum AuthOp {
    /// Adopt a login this machine already has, without a browser.
    ///
    /// Authorizing means "go get a new credential, interactively"; importing
    /// means "adopt one that already exists". They differ in prerequisites, in
    /// side effects, and in whether a human has to be present — which decides
    /// whether a headless deployment can be provisioned at all (issue #278).
    ///
    /// The per-provider flags on the authorize commands keep working.
    #[command(override_usage = "link-assistant-router auth import [OPTIONS] [PROVIDER] [DIR]")]
    Import {
        /// Which login to adopt. Omit with `--all`.
        #[arg(value_enum, required_unless_present = "all")]
        provider: Option<ImportProvider>,
        /// Where to read it from. A named directory is read exactly as given.
        ///
        /// Omitted, it defaults to the vendor's own home — `$CLAUDE_CODE_HOME`,
        /// `$CODEX_HOME`, `$GH_CONFIG_DIR`, and so on — and there, on macOS for
        /// Claude, the login Keychain is consulted too and wins when it holds
        /// the newer credential. Naming a directory says *this* credential from
        /// *there*, so the machine-wide store is left out of it (issue #285).
        dir: Option<String>,
        /// Adopt every login this machine has.
        ///
        /// The case that motivates a verb: provisioning a deployment from a
        /// workstation already logged in to several providers, without knowing
        /// each flag name and default path.
        #[arg(long, conflicts_with = "provider")]
        all: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Authorize an Anthropic Claude subscription.
    Claude {
        /// Supply the copied code without prompting on stdin.
        #[arg(long)]
        code: Option<String>,
        /// Force an OAuth flow instead of automatic selection.
        #[arg(long, value_parser = auth_flow_parser(&CLAUDE_AUTH_FLOWS), default_value = "auto")]
        flow: AuthFlow,
        /// Scope set to request: `full` (Claude Code `/login` equivalent) or
        /// `setup-token` for `user:inference` only. Defaults to what
        /// `LOGIN_CLI_ARGS` selects, then `full`.
        #[arg(long)]
        mode: Option<String>,
        /// Adopt an existing Claude login instead of authorizing.
        ///
        /// Reads the credential a vendor client already holds and installs it as
        /// this deployment's (issue #274). Default: `$CLAUDE_CODE_HOME`, else
        /// `~/.claude`, where on macOS the login Keychain is consulted as well
        /// and wins when it is the live one. A directory named explicitly is
        /// read as given (issue #285).
        #[arg(long, value_name = "DIR", num_args = 0..=1, default_missing_value = "")]
        from_claude_home: Option<String>,
        /// Remove the stored credential instead of authorizing.
        #[arg(long, conflicts_with_all = ["code", "mode", "from_claude_home"])]
        clear: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Authorize an `OpenAI` Codex / `ChatGPT` subscription.
    Codex {
        /// Force an OAuth flow instead of automatic selection.
        #[arg(long, value_parser = auth_flow_parser(&CODEX_AUTH_FLOWS), default_value = "auto")]
        flow: AuthFlow,
        /// Local callback port registered for the Codex OAuth client.
        #[arg(long, default_value_t = 1455)]
        port: u16,
        /// Adopt an existing Codex login instead of authorizing.
        ///
        /// Default: `$CODEX_HOME`, else `~/.codex` (issue #274).
        #[arg(long, value_name = "DIR", num_args = 0..=1, default_missing_value = "")]
        from_codex_home: Option<String>,
        /// Remove the stored credential instead of authorizing.
        #[arg(long, conflicts_with = "from_codex_home")]
        clear: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Store the GitHub credential the proxy presents upstream.
    ///
    /// The router mediates GitHub traffic on behalf of callers, so it needs an
    /// operator credential of its own. Reading it from a mounted `gh` config
    /// means a deployment can reuse an existing login instead of minting a
    /// separate token (issue #263).
    Gh {
        /// Read the credential from a mounted `gh` configuration directory
        /// (default: `$GH_CONFIG_DIR`, else `~/.config/gh`).
        #[arg(long, value_name = "DIR")]
        from_gh_config: Option<String>,
        /// Read the credential as one line from standard input instead.
        #[arg(long, conflicts_with = "from_gh_config")]
        token_stdin: bool,
        /// Report what is currently stored without changing it.
        #[arg(long, conflicts_with_all = ["from_gh_config", "token_stdin"])]
        status: bool,
        /// Remove the stored credential instead of storing one.
        #[arg(long, conflicts_with_all = ["from_gh_config", "token_stdin", "status"])]
        clear: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Report whether each provider credential is usable, expired, or absent.
    Status {
        /// Remove every stored credential, for decommissioning a deployment.
        ///
        /// Withdraws each provider's credential and the GitHub one in a single
        /// step, so an operator tearing down a test deployment does not have to
        /// know three separate paths (issue #268).
        #[arg(long = "clear-all")]
        clear_all: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
}

/// What `auth gh` may do when a router other than this machine is selected.
///
/// A GitHub credential is read from the router's own data directory at startup
/// and no endpoint accepts one over HTTP, so there is nothing to store
/// remotely. Acting locally under a success message is what left a workstation
/// holding a token it never needed while the targeted deployment had none
/// (issue #283), so storing refuses and only the read-only query answers.
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum RemoteGh {
    /// Report this machine's credential, saying whose it is.
    DescribeLocal,
    /// Refuse: the credential cannot reach the selected router from here.
    Refuse,
}

impl AuthOp {
    /// What this `auth gh` invocation may do against a selected router.
    ///
    /// `None` for anything that is not `auth gh`.
    #[must_use]
    pub const fn remote_gh(&self) -> Option<RemoteGh> {
        match self {
            Self::Gh { status: true, .. } => Some(RemoteGh::DescribeLocal),
            Self::Gh { .. } => Some(RemoteGh::Refuse),
            _ => None,
        }
    }
}

/// Which router an `auth` command acts on.
///
/// `auth` used to always write a local credential even when a server was
/// selected, so the obvious `server use` → `auth` → `with` sequence left the
/// targeted router unauthorized and failed later as a 401 (issue #246). The
/// default now follows the selection, exactly as `with` does; these make the
/// choice explicit when the default is not what is wanted.
#[derive(Debug, Clone, Default, clap::Args)]
pub struct AuthTarget {
    /// Authorize the local credential directory even when a server is selected.
    #[arg(long, conflicts_with = "server")]
    pub local: bool,
    /// Authorize this router instead of the selected one.
    #[arg(long, value_name = "URL", conflicts_with = "local")]
    pub server: Option<String>,
    /// Start a disposable managed container even if a router is already
    /// listening locally (issue #250).
    #[arg(long, conflicts_with_all = ["local", "server"])]
    pub managed: bool,
}

/// TLS subcommands.
#[derive(Debug, Subcommand)]
pub enum TlsOp {
    /// Print the generated certificate in PEM form.
    ///
    /// A client that must trust a self-signed router reads it from here, so a
    /// private-network deployment can distribute trust without a CA (issue
    /// #263).
    Ca,
    /// Generate the self-signed certificate without starting the server.
    Generate {
        /// Names the certificate is valid for, comma-separated. A sidecar is
        /// reached by its network alias, so that name must be present.
        #[arg(long, value_name = "NAMES", default_value = "localhost")]
        dns: String,
    },
}
