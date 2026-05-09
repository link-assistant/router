#!/usr/bin/env rust-script
//! Wait for a crates.io package version to become visible.
//!
//! The Docker release step runs after `cargo publish`, but crates.io indexing can
//! lag briefly. Waiting here makes the Docker tag and GitHub release point at a
//! crate version that users can already resolve.
//!
//! Usage:
//!   rust-script scripts/wait-for-crate.rs --release-version <version>
//!
//! Optional arguments:
//!   --crate-name <name>       Crate name. Defaults to Cargo.toml package name.
//!   --rust-root <path>        Root containing Cargo.toml. Defaults to auto-detect.
//!   --max-attempts <count>    Defaults to 30.
//!   --sleep-seconds <count>   Defaults to 10.
//!
//! Outputs (written to GITHUB_OUTPUT):
//!   - crate_available: 'true' when the version is visible
//!
//! ```cargo
//! [dependencies]
//! regex = "1"
//! ureq = "2"
//! ```

use regex::Regex;
use std::env;
use std::fs;
use std::path::Path;
use std::process::exit;
use std::thread;
use std::time::Duration;

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

fn set_output(key: &str, value: &str) {
    if let Ok(output_file) = env::var("GITHUB_OUTPUT") {
        if let Err(e) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&output_file)
            .and_then(|mut f| {
                use std::io::Write;
                writeln!(f, "{}={}", key, value)
            })
        {
            eprintln!("Warning: Could not write to GITHUB_OUTPUT: {}", e);
        }
    }
    println!("Output: {}={}", key, value);
}

fn get_package_field(cargo_toml_path: &str, field: &str) -> Result<String, String> {
    let content = fs::read_to_string(cargo_toml_path)
        .map_err(|e| format!("Failed to read {}: {}", cargo_toml_path, e))?;

    let re = Regex::new(&format!(r#"(?m)^{}\s*=\s*"([^"]+)""#, field)).unwrap();

    re.captures(&content)
        .map(|c| c.get(1).unwrap().as_str().to_string())
        .ok_or_else(|| format!("Could not find {} in {}", field, cargo_toml_path))
}

fn parse_count_arg(name: &str, default: u64) -> u64 {
    get_arg(name)
        .and_then(|value| {
            value.parse::<u64>().map_or_else(
                |_| {
                    eprintln!(
                        "Warning: Invalid {} value '{}'; using default {}",
                        name, value, default
                    );
                    None
                },
                Some,
            )
        })
        .unwrap_or(default)
}

fn crate_version_exists(crate_name: &str, version: &str) -> bool {
    let url = format!("https://crates.io/api/v1/crates/{}/{}", crate_name, version);

    match ureq::get(&url)
        .set("User-Agent", "rust-script-wait-for-crate")
        .call()
    {
        Ok(response) => response.status() == 200,
        Err(ureq::Error::Status(404, _)) => false,
        Err(e) => {
            eprintln!("Warning: Could not check crates.io: {}", e);
            false
        }
    }
}

fn main() {
    let rust_root = get_rust_root();
    let cargo_toml = get_cargo_toml_path(&rust_root);

    let crate_name = get_arg("crate-name").unwrap_or_else(|| {
        get_package_field(&cargo_toml, "name").unwrap_or_else(|e| {
            eprintln!("Error: {}", e);
            exit(1);
        })
    });

    let version = get_arg("release-version").unwrap_or_else(|| {
        get_package_field(&cargo_toml, "version").unwrap_or_else(|e| {
            eprintln!("Error: {}", e);
            exit(1);
        })
    });

    let max_attempts = parse_count_arg("max-attempts", 30);
    let sleep_seconds = parse_count_arg("sleep-seconds", 10);

    for attempt in 1..=max_attempts {
        if crate_version_exists(&crate_name, &version) {
            println!(
                "{}@{} is visible on crates.io after attempt {}",
                crate_name, version, attempt
            );
            set_output("crate_available", "true");
            return;
        }

        if attempt < max_attempts {
            println!(
                "{}@{} is not visible on crates.io yet (attempt {}/{}); waiting {}s",
                crate_name, version, attempt, max_attempts, sleep_seconds
            );
            thread::sleep(Duration::from_secs(sleep_seconds));
        }
    }

    eprintln!(
        "Error: {}@{} was not visible on crates.io after {} attempts",
        crate_name, version, max_attempts
    );
    exit(1);
}
