use std::collections::BTreeSet;
use std::ffi::OsString;

use clap::{Arg, ArgAction, ArgMatches, Command, CommandFactory as _, FromArgMatches as _};
use serde_json::{Map, Value, json};

use crate::cli::Cli;

// Keep deployment identity, privilege escalation and subscription opt-in outside
// the document. These choices need an explicit flag or environment variable.
fn document_flag(flag: &str) -> bool {
    !matches!(
        flag,
        "allow-subscription-bridge"
            | "allow-proxied-client"
            | "allow-anonymous-admin"
            | "emergency-accept-any-token"
            | "emergency-allow-non-loopback"
            | "emergency-duration-minutes"
            | "data-dir"
            | "home"
    )
}

fn flag(arg: &Arg) -> Option<&str> {
    arg.get_long()
        .filter(|name| arg.is_global_set() && document_flag(name))
}

pub(super) fn schema() -> Value {
    let command = Cli::command();
    let properties = command.get_arguments().filter_map(|arg| {
        let name = flag(arg)?;
        let parser = arg.get_value_parser().type_id();
        let boolean = matches!(arg.get_action(), ArgAction::SetTrue | ArgAction::SetFalse)
            || parser == clap::builder::ValueParser::bool().type_id();
        let mut property = if boolean {
            json!({"type": "boolean"})
        } else {
            macro_rules! integer {
                ($type:ty, $maximum:expr) => {{
                    let parser: clap::builder::ValueParser = clap::value_parser!($type).into();
                    (arg.get_value_parser().type_id() == parser.type_id()).then_some($maximum)
                }};
            }
            integer!(u16, u64::from(u16::MAX))
                .or_else(|| integer!(u32, u64::from(u32::MAX)))
                .or_else(|| integer!(u64, u64::MAX))
                .or_else(|| integer!(usize, usize::MAX as u64))
                .map_or_else(
                    || {
                        let possible = arg.get_possible_values();
                        if possible.is_empty() {
                            json!({"type": "string"})
                        } else {
                            let values: Vec<_> = possible
                                .iter()
                                .map(clap::builder::PossibleValue::get_name)
                                .collect();
                            json!({"type": "string", "enum": values})
                        }
                    },
                    |maximum| json!({"type": "integer", "minimum": 0, "maximum": maximum}),
                )
        };
        if matches!(arg.get_action(), ArgAction::Append) {
            property = json!({"type": "array", "items": property});
        }
        if let Some(help) = arg.get_help() {
            property["description"] = json!(help.to_string());
        }
        if let Some(environment) = arg.get_env() {
            property["x-environment"] = json!(environment.to_string_lossy());
        }
        if arg.is_hide_env_values_set() || crate::contracts::secret_option(arg.get_id().as_str()) {
            property["writeOnly"] = json!(true);
        }
        Some((name.to_owned(), property))
    }).collect::<Map<_, _>>();
    json!({"type": "object", "properties": properties, "additionalProperties": false})
}

pub(super) fn require_local_changes(before: &Value, after: &Value) -> Result<(), &'static str> {
    for name in [
        "token-secret",
        "admin-key",
        "upstream-base-url",
        "openai-compatible-base-url",
        "openai-compatible-api-key-env",
        "gonka-source-url",
        "crater-forgefed-inbox",
        "account-egress-proxy",
        "model-catalog-sources",
        "claude-code-home",
        "additional-account-dirs",
        "login-cli-command",
        "login-cli-args",
        "claude-cli-bin",
        "codex-cli-bin",
        "audit-log",
        "request-log",
        "listener",
        "admin-host",
        "admin-port",
        "management-allow-remote",
        "management-lockout-failures",
        "management-lockout-secs",
        "management-lockout-exempt-loopback",
    ] {
        if before["cli"].get(name) != after["cli"].get(name) {
            return Err("this CLI setting may only be changed in the local TOML file");
        }
    }
    Ok(())
}

#[derive(Clone)]
pub(super) struct Input {
    command: Command,
    arguments: Vec<OsString>,
    // Claimed environment values are parsed as defaults when a host embeds the
    // CLI. Preserve their precedence over file defaults as well.
    environment: BTreeSet<String>,
    pub(super) overridden: BTreeSet<String>,
}

impl Input {
    pub(super) fn new(command: Command, arguments: Vec<OsString>, matches: &ArgMatches) -> Self {
        let mut environment = BTreeSet::new();
        let mut overridden = BTreeSet::new();
        for arg in Cli::command().get_arguments() {
            if let Some(name) = flag(arg) {
                if arg
                    .get_env()
                    .is_some_and(|env| crate::operation_context::var_os(env).is_some())
                {
                    environment.insert(name.to_owned());
                    overridden.insert(name.to_owned());
                }
                if matches.value_source(arg.get_id().as_str())
                    == Some(clap::parser::ValueSource::CommandLine)
                {
                    overridden.insert(name.to_owned());
                }
            }
        }
        if crate::operation_context::var_os(crate::token_secret::FILE_ENV)
            .is_some_and(|path| !path.is_empty())
        {
            environment.insert("token-secret".to_owned());
            overridden.insert("token-secret".to_owned());
        }
        Self {
            command,
            arguments,
            environment,
            overridden,
        }
    }

    pub(super) fn resolve(&self, document: &Value) -> Result<Cli, &'static str> {
        let mut command = self.command.clone();
        if let Some(values) = document["cli"].as_object() {
            // Parse the file representation independently even if a process
            // argument masks one of its settings.
            let mut standalone = Command::new("router-config");
            for arg in Cli::command().get_arguments() {
                if let Some(name) = flag(arg)
                    && let Some(value) = values.get(name)
                {
                    standalone = standalone.arg(default(
                        arg.clone()
                            .global(false)
                            .env(clap::builder::Resettable::Reset),
                        value,
                    ));
                }
            }
            standalone
                .try_get_matches_from(["router-config"])
                .map_err(|_| "a runtime configuration CLI setting has an invalid value")?;

            command = command.mut_args(|arg| {
                if let Some(name) = flag(&arg)
                    && !self.environment.contains(name)
                    && let Some(value) = values.get(name)
                {
                    return default(arg, value);
                }
                arg
            });
        }
        let matches = command
            .try_get_matches_from(self.arguments.iter())
            .map_err(|_| "runtime configuration conflicts with the server arguments")?;
        Cli::from_arg_matches(&matches)
            .map_err(|_| "runtime configuration could not be parsed by the CLI")
    }
}

fn default(arg: Arg, value: &Value) -> Arg {
    fn scalar(value: &Value) -> String {
        value
            .as_str()
            .map_or_else(|| value.to_string(), ToOwned::to_owned)
    }
    if let Some(values) = value.as_array() {
        arg.default_values(values.iter().map(scalar))
    } else {
        arg.default_value(scalar(value))
    }
}
