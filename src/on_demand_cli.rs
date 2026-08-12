//! Disposable package-runner environments for vendor CLI compatibility.

use std::path::{Path, PathBuf};

use crate::login::LoginConfig;

/// Owns a temporary package cache and removes it when the login ends.
#[derive(Debug)]
pub struct DisposableCli {
    root: PathBuf,
}

impl DisposableCli {
    /// Configure Claude Code to run from a temporary bun (preferred) or npm
    /// cache. No vendor CLI is installed globally or retained afterwards.
    pub fn claude(base: &LoginConfig) -> Result<(Self, LoginConfig), String> {
        let root = std::env::temp_dir().join(format!(
            "link-assistant-claude-cli-{}",
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&root)
            .map_err(|error| format!("could not create disposable CLI directory: {error}"))?;
        let mut config = base.clone();
        if command_exists("bun") {
            config.command = "bun".into();
            config.args = vec![
                "x".into(),
                "--bun".into(),
                "@anthropic-ai/claude-code@latest".into(),
            ];
            config.package_cache = Some(root.join("bun-cache"));
        } else if command_exists("npx") {
            config.command = "npx".into();
            config.args = vec![
                "--yes".into(),
                "--cache".into(),
                root.join("npm-cache").to_string_lossy().into_owned(),
                "@anthropic-ai/claude-code@latest".into(),
            ];
            config.package_cache = Some(root.join("npm-cache"));
        } else {
            let _ = std::fs::remove_dir_all(&root);
            return Err(
                "Claude CLI fallback needs bun (preferred) or node/npm's npx in PATH".into(),
            );
        }
        Ok((Self { root }, config))
    }

    #[must_use]
    pub fn root(&self) -> &Path {
        &self.root
    }
}

impl Drop for DisposableCli {
    fn drop(&mut self) {
        if let Err(error) = std::fs::remove_dir_all(&self.root)
            && error.kind() != std::io::ErrorKind::NotFound
        {
            tracing::warn!(path = %self.root.display(), %error, "could not remove disposable CLI directory");
        }
    }
}

fn command_exists(command: &str) -> bool {
    std::env::var_os("PATH").is_some_and(|paths| {
        std::env::split_paths(&paths).any(|directory| {
            let candidate = directory.join(command);
            candidate.is_file()
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disposable_directory_is_removed_on_drop() {
        let root =
            std::env::temp_dir().join(format!("router-disposable-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).unwrap();
        let guard = DisposableCli { root: root.clone() };
        std::fs::write(guard.root().join("downloaded-package"), b"test").unwrap();
        drop(guard);
        assert!(!root.exists());
    }

    #[test]
    fn cleanup_keeps_the_resulting_credential() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("download-cache");
        let credential_home = temp.path().join("claude-home");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::create_dir_all(&credential_home).unwrap();
        let guard = DisposableCli { root: root.clone() };
        std::fs::write(guard.root().join("vendor-cli"), b"downloaded").unwrap();
        std::fs::write(
            credential_home.join(".credentials.json"),
            br#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-result"}}"#,
        )
        .unwrap();

        drop(guard);

        assert!(!root.exists());
        let token = crate::subscription::SubscriptionReader::new(
            crate::subscription::SubscriptionProvider::Claude,
            credential_home,
        )
        .read_token()
        .unwrap();
        assert_eq!(token.access_token, "sk-ant-oat-result");
    }
}
