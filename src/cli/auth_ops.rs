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
    /// Runs on the deployment being provisioned: it installs into the
    /// credential home of the machine executing it, and no router accepts a
    /// credential over HTTP. With another router selected this refuses and
    /// names it, rather than answering about the local home (issue #291); use
    /// `auth claude` or `auth codex` to authorize a remote deployment.
    ///
    /// The per-provider flags on the authorize commands keep working.
    #[command(override_usage = "router auth import [OPTIONS] [PROVIDER] [DIR]")]
    Import {
        /// Which login to adopt. Omit with `--all`.
        #[arg(value_enum, required_unless_present = "all")]
        provider: Option<ImportProvider>,
        /// Where to read it from. A named directory is read exactly as given.
        ///
        /// Omitted, it defaults to the vendor client's conventional directory —
        /// `~/.claude`, `~/.codex`, `~/.config/gh` — and there, on macOS for
        /// Claude, the login Keychain is consulted too and wins when it holds
        /// the newer credential. Naming a directory says *this* credential from
        /// *there*, so the machine-wide store is left out of it (issue #285).
        ///
        /// `$CLAUDE_CODE_HOME` and `$CODEX_HOME` are deliberately *not* the
        /// source: in a deployment they name this router's own credential
        /// directory — the destination — so reading the source through them
        /// would make every unqualified import refuse itself (issue #307). Pass
        /// the directory to read from another location.
        dir: Option<String>,
        /// Adopt every login this machine has.
        ///
        /// The case that motivates a verb: provisioning a deployment from a
        /// machine already logged in to several providers, without knowing each
        /// flag name and default path. Run it on that deployment — import
        /// writes the executing machine's credential home (issue #291).
        #[arg(long, conflicts_with = "provider")]
        all: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Remove a stored login from this deployment.
    ///
    /// Withdrawal is the most destructive thing this tool does and had no
    /// name: it was four flags, the widest of them attached to a command
    /// called `status`, so `auth --help` said nothing about it at all. The
    /// per-command `--clear` flags keep working (issue #305).
    ///
    /// Removes credentials on the machine it runs on. No router accepts a
    /// withdrawal over HTTP, so with another router selected this refuses and
    /// names it — silently rewriting "there" as "here" is unrecoverable for an
    /// OAuth credential, which then needs a fresh browser login on a machine
    /// that may not have a browser.
    #[command(override_usage = "router auth clear [OPTIONS] [PROVIDER]")]
    Clear {
        /// Which login to remove. Omit with `--all`.
        #[arg(value_enum, required_unless_present = "all")]
        provider: Option<ImportProvider>,
        /// Remove every login this deployment holds.
        #[arg(long, conflicts_with = "provider")]
        all: bool,
        /// Confirm removing more than one credential without a prompt.
        #[arg(long)]
        yes: bool,
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
        /// this deployment's (issue #274). Default: `~/.claude`, where on macOS
        /// the login Keychain is consulted as well and wins when it is the live
        /// one. A directory named explicitly is read as given (issue #285).
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
        /// Default: `~/.codex` (issue #274).
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
        /// `router auth clear --all` is the same operation with a name.
        #[arg(long = "clear-all")]
        clear_all: bool,
        /// Confirm removing more than one credential without a prompt.
        ///
        /// An OAuth login cannot be put back without a browser, and this is
        /// the widest blast radius in the tool — five credentials in one call,
        /// on a command called `status` (issue #305).
        #[arg(long, requires = "clear_all")]
        yes: bool,
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

/// Whether an `auth import` invocation may act on the machine running it.
///
/// Import installs into the credential home of the executing machine, and no
/// router accepts a credential document over HTTP, so an import aimed at a
/// different deployment has nothing it can do. Deciding that here — beside the
/// flags it reads — keeps the rule unit-testable rather than reachable only by
/// spawning the binary against a live server (issue #291).
///
/// `None` for anything that is not an `import`: the per-provider
/// `--from-*-home` flags carry no target of their own.
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum ImportTarget {
    /// Act here: `--local`, `--managed`, or no selection at all.
    Local,
    /// A different router was named or selected; resolve it and refuse.
    Remote,
}

impl AuthOp {
    /// Whether this `auth import` may install into the local credential home.
    ///
    /// Answers from the flags alone. A bare invocation is [`Self::may_be_remote`]
    /// because a *persisted* selection also counts as naming a target, which
    /// only resolution can determine.
    #[must_use]
    pub const fn import_target(&self) -> Option<ImportTarget> {
        match self {
            Self::Import { target, .. } => {
                if target.local || target.managed {
                    Some(ImportTarget::Local)
                } else {
                    Some(ImportTarget::Remote)
                }
            }
            _ => None,
        }
    }

    /// Whether this invocation must resolve a target before importing.
    ///
    /// `false` short-circuits resolution entirely, so `--local` never contacts
    /// a server and never fails because one is unreachable.
    #[must_use]
    pub const fn may_be_remote(&self) -> bool {
        matches!(self.import_target(), Some(ImportTarget::Remote))
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
    /// Act on this machine even when a server is selected.
    #[arg(long, conflicts_with = "server")]
    pub local: bool,
    /// Act on this router instead of the selected one.
    #[arg(long, value_name = "URL", conflicts_with = "local")]
    pub server: Option<String>,
    /// Start a disposable managed container even if a router is already
    /// listening locally (issue #250).
    ///
    /// Accepted by the commands that can use one — `with`, `configure` and
    /// `auth`. The families that only read or change router state refuse it
    /// and name `--local`, because there it started nothing and quietly meant
    /// `--local` anyway (issue #315).
    #[arg(long, conflicts_with_all = ["local", "server"])]
    pub managed: bool,
}

/// TLS subcommands.
///
/// The artefact `ca` prints is a trust anchor, so answering for the wrong
/// machine does not produce a wrong report — it produces trust in the wrong
/// key. `tls` therefore takes the same target flags as every other
/// state-touching family, and says so when it cannot answer for the target
/// (issue #308).
#[derive(Debug, Subcommand)]
pub enum TlsOp {
    /// Print the generated certificate in PEM form.
    ///
    /// A client that must trust a self-signed router reads it from here, so a
    /// private-network deployment can distribute trust without a CA (issue
    /// #263).
    Ca {
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Generate the self-signed certificate without starting the server.
    Generate {
        /// Names the certificate is valid for, comma-separated. A sidecar is
        /// reached by its network alias, so that name must be present.
        #[arg(long, value_name = "NAMES", default_value = "localhost")]
        dns: String,
        #[command(flatten)]
        target: AuthTarget,
    },
}

impl TlsOp {
    /// Which router this certificate operation acts on.
    #[must_use]
    pub const fn target(&self) -> &AuthTarget {
        match self {
            Self::Ca { target } | Self::Generate { target, .. } => target,
        }
    }
}
