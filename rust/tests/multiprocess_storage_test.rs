//! Black-box regression coverage for concurrent router processes sharing the
//! default dual-format token store.

use std::process::{Child, Command, Stdio};

fn command(home: &std::path::Path) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .env("HOME", home)
        .env("DATA_DIR", home.join("router-data"))
        .env("TOKEN_SECRET", "multiprocess-storage-secret")
        .env("STORAGE_POLICY", "both");
    command
}

#[test]
fn concurrent_processes_do_not_lose_dual_store_updates() {
    let home = tempfile::tempdir().expect("temporary home");
    let mut children: Vec<(String, Child)> = (0..8)
        .map(|index| {
            let label = format!("process-{index}");
            let child = command(home.path())
                .args(["tokens", "issue", "--label", &label])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .expect("spawn token issuer");
            (label, child)
        })
        .collect();

    for (label, child) in &mut children {
        let status = child.wait().expect("wait for token issuer");
        assert!(status.success(), "issuer for {label} failed with {status}");
    }

    let output = command(home.path())
        .args(["tokens", "list"])
        .output()
        .expect("list tokens after concurrent writes");
    assert!(output.status.success());
    let listing = String::from_utf8(output.stdout).expect("UTF-8 token list");
    for (label, _) in children {
        assert!(
            listing.contains(&label),
            "missing concurrent update {label}"
        );
    }

    let data = home.path().join("router-data");
    assert!(data.join("tokens.lino").exists());
    assert!(data.join("tokens.bin").exists());
    assert!(!data.join("tokens.transaction.json").exists());
}
