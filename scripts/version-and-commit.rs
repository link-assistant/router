#!/usr/bin/env rust-script
//! Bump version in Cargo.toml and commit changes
//! Used by the CI/CD pipeline for releases
//!
//! Supports both single-language and multi-language repository structures:
//! - Single-language: Cargo.toml and changelog.d/ in repository root
//! - Multi-language: Cargo.toml and changelog.d/ in rust/ subfolder
//!
//! Usage: rust-script scripts/version-and-commit.rs --bump-type <major|minor|patch> [--description <desc>] [--rust-root <path>]
//!
//! ```cargo
//! [dependencies]
//! regex = "1"
//! chrono = "0.4"
//! ```

use chrono::Utc;
use regex::Regex;
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::{exit, Command};

fn get_arg(name: &str) -> Option<String> {
    let args: Vec<String> = env::args().collect();
    let flag = format!("--{}", name);

    if let Some(idx) = args.iter().position(|a| a == &flag) {
        return args.get(idx + 1).cloned();
    }

    let env_name = name.to_uppercase().replace('-', "_");
    env::var(&env_name).ok().filter(|s| !s.is_empty())
}

fn get_rust_root() -> String {
    if let Some(root) = get_arg("rust-root") {
        eprintln!("Using explicitly configured Rust root: {}", root);
        return root;
    }

    if Path::new("./Cargo.toml").exists() {
        eprintln!("Detected single-language repository (Cargo.toml in root)");
        return ".".to_string();
    }

    if Path::new("./rust/Cargo.toml").exists() {
        eprintln!("Detected multi-language repository (Cargo.toml in rust/)");
        return "rust".to_string();
    }

    eprintln!("Error: Could not find Cargo.toml in expected locations");
    exit(1);
}

fn get_cargo_toml_path(rust_root: &str) -> String {
    if rust_root == "." {
        "./Cargo.toml".to_string()
    } else {
        format!("{}/Cargo.toml", rust_root)
    }
}

fn get_cargo_lock_path(rust_root: &str) -> String {
    if rust_root == "." {
        "./Cargo.lock".to_string()
    } else {
        format!("{}/Cargo.lock", rust_root)
    }
}

fn get_changelog_dir(rust_root: &str) -> String {
    if rust_root == "." {
        "./changelog.d".to_string()
    } else {
        format!("{}/changelog.d", rust_root)
    }
}

fn get_changelog_path(rust_root: &str) -> String {
    if rust_root == "." {
        "./CHANGELOG.md".to_string()
    } else {
        format!("{}/CHANGELOG.md", rust_root)
    }
}

fn set_output(key: &str, value: &str) {
    if let Ok(output_file) = env::var("GITHUB_OUTPUT") {
        if let Ok(mut file) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&output_file)
        {
            let _ = writeln!(file, "{}={}", key, value);
        }
    }
    println!("Output: {}={}", key, value);
}

fn exec(command: &str, args: &[&str]) -> Result<String, String> {
    match Command::new(command).args(args).output() {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Command failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute: {}", e)),
    }
}

fn exec_check(command: &str, args: &[&str]) -> bool {
    Command::new(command)
        .args(args)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

struct Version {
    major: u32,
    minor: u32,
    patch: u32,
}

impl Version {
    fn parse(content: &str) -> Option<Version> {
        let re = Regex::new(r#"(?m)^version\s*=\s*"(\d+)\.(\d+)\.(\d+)""#).ok()?;
        let caps = re.captures(content)?;
        Some(Version {
            major: caps.get(1)?.as_str().parse().ok()?,
            minor: caps.get(2)?.as_str().parse().ok()?,
            patch: caps.get(3)?.as_str().parse().ok()?,
        })
    }

    fn bump(&self, bump_type: &str) -> String {
        match bump_type {
            "major" => format!("{}.0.0", self.major + 1),
            "minor" => format!("{}.{}.0", self.major, self.minor + 1),
            _ => format!("{}.{}.{}", self.major, self.minor, self.patch + 1),
        }
    }
}

fn update_cargo_toml(cargo_toml_path: &str, new_version: &str) -> Result<(), String> {
    let content = fs::read_to_string(cargo_toml_path)
        .map_err(|e| format!("Failed to read {}: {}", cargo_toml_path, e))?;

    let re = Regex::new(r#"(?m)^(version\s*=\s*")[^"]+(")"#).unwrap();
    let new_content = re.replace(&content, format!("${{1}}{}${{2}}", new_version).as_str());

    fs::write(cargo_toml_path, new_content.as_ref())
        .map_err(|e| format!("Failed to write {}: {}", cargo_toml_path, e))?;

    println!("Updated {} to version {}", cargo_toml_path, new_version);
    Ok(())
}

fn update_cargo_lock(
    cargo_lock_path: &str,
    crate_name: &str,
    new_version: &str,
) -> Result<bool, String> {
    if !Path::new(cargo_lock_path).exists() {
        println!("No Cargo.lock at {cargo_lock_path}; skipping lockfile synchronization");
        return Ok(false);
    }

    let content = fs::read_to_string(cargo_lock_path)
        .map_err(|e| format!("Failed to read {cargo_lock_path}: {e}"))?;
    let pattern = format!(
        r#"(?m)(\[\[package\]\]\s*\nname\s*=\s*"{}"\s*\nversion\s*=\s*")[^"]+(")"#,
        regex::escape(crate_name),
    );
    let package = Regex::new(&pattern)
        .map_err(|e| format!("Failed to build Cargo.lock package matcher: {e}"))?;

    if !package.is_match(&content) {
        return Err(format!(
            "Could not find [[package]] entry for `{crate_name}` in {cargo_lock_path}"
        ));
    }

    let updated = package.replace(&content, format!("${{1}}{new_version}${{2}}").as_str());
    if updated == content {
        println!("Cargo.lock already contains version {new_version}");
        return Ok(false);
    }

    fs::write(cargo_lock_path, updated.as_ref())
        .map_err(|e| format!("Failed to write {cargo_lock_path}: {e}"))?;
    println!("Updated {cargo_lock_path} to version {new_version}");
    Ok(true)
}

fn check_tag_exists(version: &str) -> bool {
    exec_check("git", &["rev-parse", &format!("v{}", version)])
}

fn strip_frontmatter(content: &str) -> String {
    let re = Regex::new(r"(?s)^---\s*\n.*?\n---\s*\n(.*)$").unwrap();
    if let Some(caps) = re.captures(content) {
        caps.get(1).unwrap().as_str().trim().to_string()
    } else {
        content.trim().to_string()
    }
}

fn collect_changelog(changelog_dir: &str, changelog_file: &str, version: &str) {
    let dir_path = Path::new(changelog_dir);
    if !dir_path.exists() {
        return;
    }

    let mut files: Vec<_> = match fs::read_dir(dir_path) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.extension().map_or(false, |ext| ext == "md")
                    && p.file_name().map_or(false, |name| name != "README.md")
            })
            .collect(),
        Err(_) => return,
    };

    if files.is_empty() {
        return;
    }

    files.sort();

    let fragments: Vec<String> = files
        .iter()
        .filter_map(|f| fs::read_to_string(f).ok())
        .map(|c| strip_frontmatter(&c))
        .filter(|c| !c.is_empty())
        .collect();

    if fragments.is_empty() {
        return;
    }

    let date_str = Utc::now().format("%Y-%m-%d").to_string();
    let new_entry = format!(
        "\n## [{}] - {}\n\n{}\n",
        version,
        date_str,
        fragments.join("\n\n")
    );

    if Path::new(changelog_file).exists() {
        let mut content = fs::read_to_string(changelog_file).unwrap_or_default();
        let lines: Vec<&str> = content.lines().collect();
        let mut insert_index = None;

        for (i, line) in lines.iter().enumerate() {
            if line.starts_with("## [") {
                insert_index = Some(i);
                break;
            }
        }

        if let Some(idx) = insert_index {
            let mut new_lines: Vec<String> = lines[..idx].iter().map(|s| s.to_string()).collect();
            new_lines.push(new_entry.clone());
            new_lines.extend(lines[idx..].iter().map(|s| s.to_string()));
            content = new_lines.join("\n");
        } else {
            content.push_str(&new_entry);
        }

        fs::write(changelog_file, content).expect("Failed to write changelog");
    }

    // Removed once collected, or the next release collects them again. This
    // was the whole defect: only `collect-changelog.rs` deleted, and that is
    // the manual dispatch path, so the automatic release on merge to main
    // re-collected every fragment ever written. Each release therefore
    // republished the entire archive as though it were new -- 154 fragments
    // and a 145 KB section for one version by v0.120.0 (issue #337).
    for file in &files {
        if let Err(error) = fs::remove_file(file) {
            // Failing the release over a leftover file would be worse than
            // the duplication; the next release collects it again and the
            // guard below is what makes that visible.
            eprintln!(
                "warning: could not remove collected fragment {}: {error}",
                file.display()
            );
        }
    }

    println!("Collected and removed {} changelog fragment(s)", files.len());
}

fn main() {
    let bump_type = match get_arg("bump-type") {
        Some(bt) => bt,
        None => {
            eprintln!("Usage: rust-script scripts/version-and-commit.rs --bump-type <major|minor|patch> [--description <desc>] [--rust-root <path>]");
            exit(1);
        }
    };

    if !["major", "minor", "patch"].contains(&bump_type.as_str()) {
        eprintln!(
            "Invalid bump type: {}. Must be major, minor, or patch.",
            bump_type
        );
        exit(1);
    }

    let description = get_arg("description");
    let rust_root = get_rust_root();
    let cargo_toml = get_cargo_toml_path(&rust_root);
    let cargo_lock = get_cargo_lock_path(&rust_root);
    let changelog_dir = get_changelog_dir(&rust_root);
    let changelog_file = get_changelog_path(&rust_root);

    // Configure git
    let _ = exec("git", &["config", "user.name", "github-actions[bot]"]);
    let _ = exec(
        "git",
        &[
            "config",
            "user.email",
            "github-actions[bot]@users.noreply.github.com",
        ],
    );

    // Get current version
    let content = match fs::read_to_string(&cargo_toml) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error reading {}: {}", cargo_toml, e);
            exit(1);
        }
    };

    let current = match Version::parse(&content) {
        Some(v) => v,
        None => {
            eprintln!("Error: Could not parse version from {}", cargo_toml);
            exit(1);
        }
    };

    let new_version = current.bump(&bump_type);

    // Check if this version was already released
    if check_tag_exists(&new_version) {
        println!("Tag v{} already exists", new_version);
        set_output("already_released", "true");
        set_output("new_version", &new_version);
        return;
    }

    // Update version in Cargo.toml
    if let Err(e) = update_cargo_toml(&cargo_toml, &new_version) {
        eprintln!("Error: {}", e);
        exit(1);
    }

    let lock_updated = match update_cargo_lock(&cargo_lock, "link-assistant-router", &new_version) {
        Ok(updated) => updated,
        Err(e) => {
            eprintln!("Error: {e}");
            exit(1);
        }
    };

    // Collect changelog fragments
    collect_changelog(&changelog_dir, &changelog_file, &new_version);

    // Stage the manifest, synchronized lockfile, and changelog together.
    let mut release_files = vec!["add", &cargo_toml, &changelog_file];
    if lock_updated {
        release_files.push(&cargo_lock);
    }
    if let Err(e) = exec("git", &release_files) {
        eprintln!("Error staging release files: {e}");
        exit(1);
    }

    // Check if there are changes to commit
    if exec_check("git", &["diff", "--cached", "--quiet"]) {
        // No changes to commit
        println!("No changes to commit");
        set_output("version_committed", "false");
        set_output("new_version", &new_version);
        return;
    }

    // Commit changes
    let commit_msg = match &description {
        Some(desc) => format!("chore: release v{}\n\n{}", new_version, desc),
        None => format!("chore: release v{}", new_version),
    };

    if let Err(e) = exec("git", &["commit", "-m", &commit_msg]) {
        eprintln!("Error committing: {}", e);
        exit(1);
    }
    println!("Committed version {}", new_version);

    // Create tag
    let tag_msg = match &description {
        Some(desc) => format!("Release v{}\n\n{}", new_version, desc),
        None => format!("Release v{}", new_version),
    };

    if let Err(e) = exec(
        "git",
        &["tag", "-a", &format!("v{}", new_version), "-m", &tag_msg],
    ) {
        eprintln!("Error creating tag: {}", e);
        exit(1);
    }
    println!("Created tag v{}", new_version);

    // Push changes and tag
    if let Err(e) = exec("git", &["push"]) {
        eprintln!("Error pushing: {}", e);
        exit(1);
    }

    if let Err(e) = exec("git", &["push", "--tags"]) {
        eprintln!("Error pushing tags: {}", e);
        exit(1);
    }
    println!("Pushed changes and tags");

    set_output("version_committed", "true");
    set_output("new_version", &new_version);
}

#[cfg(test)]
mod tests {
    use super::{collect_changelog, update_cargo_lock};
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_lock(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after the Unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("router-{name}-{nonce}.lock"))
    }

    #[test]
    fn lock_update_changes_only_the_named_package() {
        let lock = temp_lock("update");
        fs::write(
            &lock,
            r#"[[package]]
name = "link-assistant-router-helper"
version = "9.9.9"

[[package]]
name = "link-assistant-router"
version = "0.28.0"

[[package]]
name = "dependency"
version = "1.2.3"
"#,
        )
        .expect("fixture should be writable");

        assert!(update_cargo_lock(
            lock.to_str().expect("temporary path should be UTF-8"),
            "link-assistant-router",
            "0.29.0",
        )
        .expect("lock update should succeed"));

        let updated = fs::read_to_string(&lock).expect("updated fixture should be readable");
        assert!(updated.contains("name = \"link-assistant-router\"\nversion = \"0.29.0\""));
        assert!(updated.contains("name = \"link-assistant-router-helper\"\nversion = \"9.9.9\""));
        assert!(updated.contains("name = \"dependency\"\nversion = \"1.2.3\""));
        fs::remove_file(lock).expect("temporary fixture should be removable");
    }

    #[test]
    fn lock_update_is_idempotent() {
        let lock = temp_lock("idempotent");
        let content = "[[package]]\nname = \"link-assistant-router\"\nversion = \"0.29.0\"\n";
        fs::write(&lock, content).expect("fixture should be writable");

        assert!(!update_cargo_lock(
            lock.to_str().expect("temporary path should be UTF-8"),
            "link-assistant-router",
            "0.29.0",
        )
        .expect("idempotent update should succeed"));
        assert_eq!(
            fs::read_to_string(&lock).expect("fixture should be readable"),
            content
        );
        fs::remove_file(lock).expect("temporary fixture should be removable");
    }

    #[test]
    fn lock_update_rejects_a_missing_package_entry() {
        let lock = temp_lock("missing");
        fs::write(
            &lock,
            "[[package]]\nname = \"dependency\"\nversion = \"1.2.3\"\n",
        )
        .expect("fixture should be writable");

        let error = update_cargo_lock(
            lock.to_str().expect("temporary path should be UTF-8"),
            "link-assistant-router",
            "0.29.0",
        )
        .expect_err("a missing root package must fail closed");
        assert!(error.contains("Could not find [[package]] entry"));
        fs::remove_file(lock).expect("temporary fixture should be removable");
    }

    /// A collected fragment is removed, so the next release does not collect
    /// it again.
    ///
    /// Only `collect-changelog.rs` deleted, and that is the manual dispatch
    /// path; the automatic release on merge ran this script, which collected
    /// and never removed. Every release therefore republished every fragment
    /// ever written -- 154 of them, and a 145 KB section for one version, by
    /// v0.120.0 (issue #337).
    #[test]
    fn collected_fragments_are_removed() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("changelog-collect-{nonce}"));
        let fragments = root.join("changelog.d");
        fs::create_dir_all(&fragments).expect("create the fragment directory");
        let changelog = root.join("CHANGELOG.md");
        fs::write(&changelog, "# Changelog\n\n## [0.1.0] - 2020-01-01\n\nold\n")
            .expect("seed the changelog");
        fs::write(
            fragments.join("20260101_000000_first.md"),
            "---\nbump: minor\n---\n\n### Added\n- a first thing\n",
        )
        .expect("write a fragment");
        // README.md is documentation, not a fragment, and must survive.
        fs::write(fragments.join("README.md"), "how to write a fragment\n")
            .expect("write the readme");

        collect_changelog(
            fragments.to_str().expect("path"),
            changelog.to_str().expect("path"),
            "0.2.0",
        );

        let collected = fs::read_to_string(&changelog).expect("read the changelog");
        assert!(
            collected.contains("a first thing"),
            "the fragment must reach the changelog: {collected}"
        );
        assert!(
            !fragments.join("20260101_000000_first.md").exists(),
            "a collected fragment must not be collected again by the next release"
        );
        assert!(
            fragments.join("README.md").exists(),
            "the directory's documentation is not a fragment"
        );

        // And a second release over the same directory adds nothing.
        collect_changelog(
            fragments.to_str().expect("path"),
            changelog.to_str().expect("path"),
            "0.3.0",
        );
        let after = fs::read_to_string(&changelog).expect("read the changelog");
        assert_eq!(
            after.matches("a first thing").count(),
            1,
            "an entry belongs to one release, not every release after it: {after}"
        );

        fs::remove_dir_all(&root).expect("clean up");
    }
}
