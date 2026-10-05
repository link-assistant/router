//! Default images are checked before planning or writing deployment state.
#![cfg(unix)]

use std::os::unix::fs::PermissionsExt as _;
use std::process::Command;

#[test]
fn an_unpublished_default_image_refuses_local_and_staging_plans_without_writes() {
    let home = tempfile::tempdir().unwrap();
    let docker = home.path().join("docker");
    std::fs::write(&docker, "#!/bin/sh\ncase \"$1\" in info) echo 28; exit 0;; ps) exit 0;; esac\necho 'manifest unknown' >&2\nexit 1\n").unwrap();
    std::fs::set_permissions(&docker, std::fs::Permissions::from_mode(0o700)).unwrap();
    for staging in [false, true] {
        let root = home.path().join(if staging { "staging" } else { "local" });
        let mut command = Command::new(env!("CARGO_BIN_EXE_router"));
        command.args(["deploy", "--root", root.to_str().unwrap(), "--status"]);
        if staging {
            command.args(["--staging", "image-preflight"]);
        }
        let output = command
            .env("HOME", home.path())
            .env("DATA_DIR", home.path().join("data"))
            .env(
                "PATH",
                format!(
                    "{}:{}",
                    home.path().display(),
                    std::env::var("PATH").unwrap()
                ),
            )
            .env("TOKEN_SECRET", "image-preflight-secret")
            .env("RUST_LOG", "error")
            .output()
            .unwrap();
        let rendered = format!(
            "{}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(!output.status.success(), "{rendered}");
        assert!(rendered.contains("image-unpublished"), "{rendered}");
        assert!(
            rendered.contains(&format!(
                "image for {} is not published",
                link_assistant_router::VERSION
            )),
            "{rendered}"
        );
        assert!(rendered.contains("pass --image"), "{rendered}");
        assert!(!rendered.contains("plan step="), "{rendered}");
        assert!(!root.exists(), "preflight must not create deployment state");
    }
}
