//! Tracing filter construction shared by the binary and regression tests.

use tracing_subscriber::EnvFilter;

/// Construct and announce the bounded request-log destination.
#[must_use]
pub fn request_log(
    data_dir: &std::path::Path,
    configured_path: Option<&std::path::Path>,
    max_bytes: u64,
) -> std::sync::Arc<crate::request_log::RequestLog> {
    let path = configured_path.map_or_else(
        || data_dir.join("requests.jsonl"),
        std::path::Path::to_path_buf,
    );
    tracing::info!("Request log: {} (max {max_bytes} bytes)", path.display());
    std::sync::Arc::new(crate::request_log::RequestLog::new(path, max_bytes))
}

/// Install the process-wide tracing subscriber.
pub fn init(verbose: bool) {
    tracing_subscriber::fmt()
        .with_env_filter(env_filter(
            verbose,
            std::env::var("RUST_LOG").ok().as_deref(),
        ))
        .init();
}

/// Build the lazy compatibility logger used by existing proxy code.
#[must_use]
pub fn build_lazy(verbose: bool) -> log_lazy::LogLazy {
    let level = if verbose {
        log_lazy::levels::ALL
    } else {
        log_lazy::levels::PRODUCTION
    };
    log_lazy::LogLazy::with_sink(level, |level, message| match level {
        log_lazy::Level::FATAL | log_lazy::Level::ERROR => tracing::error!("{message}"),
        log_lazy::Level::WARN => tracing::warn!("{message}"),
        log_lazy::Level::INFO => tracing::info!("{message}"),
        log_lazy::Level::DEBUG => tracing::debug!("{message}"),
        _ => tracing::trace!("{message}"),
    })
}

/// Build the tracing filter, treating `RUST_LOG` as an override and the CLI
/// verbosity as a fallback only.
#[must_use]
pub fn env_filter(verbose: bool, rust_log: Option<&str>) -> EnvFilter {
    let fallback = if verbose { "debug" } else { "info" };
    rust_log
        .filter(|value| !value.trim().is_empty())
        .and_then(|value| EnvFilter::try_new(value).ok())
        .unwrap_or_else(|| EnvFilter::new(fallback))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tracing::level_filters::LevelFilter;

    #[test]
    fn rust_log_takes_precedence_over_default_level() {
        let filter = env_filter(false, Some("trace"));
        assert_eq!(filter.max_level_hint(), Some(LevelFilter::TRACE));
    }

    #[test]
    fn verbosity_is_only_used_without_a_valid_environment_filter() {
        assert_eq!(
            env_filter(false, None).max_level_hint(),
            Some(LevelFilter::INFO)
        );
        assert_eq!(
            env_filter(true, Some("not a valid directive[[")).max_level_hint(),
            Some(LevelFilter::DEBUG)
        );
    }
}
