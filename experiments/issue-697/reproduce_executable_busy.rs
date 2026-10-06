//! Finite reproduction of parallel freshly-written vendor executable races.
//!
//! Compile against the existing Router and tempfile rlibs (see README.md).
//! Run with a 512 MiB address-space and 2 MiB per-thread stack limit.
use link_assistant_router::{deploy_image, operation_context::OperationContext};
use std::os::unix::fs::PermissionsExt as _;

fn main() {
    let mut failures = Vec::new();
    std::thread::scope(|scope| {
        let workers: Vec<_> = (0..8)
            .map(|_| {
                scope.spawn(|| {
                    let mut errors = Vec::new();
                    for _ in 0..128 {
                        let directory = tempfile::tempdir().unwrap();
                        let script = directory.path().join("docker");
                        std::fs::write(&script, "#!/bin/sh\necho unauthorized >&2; exit 1\n")
                            .unwrap();
                        std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o700))
                            .unwrap();
                        let mut context = OperationContext::isolated(directory.path());
                        context.set_env("PATH", directory.path());
                        let error = context
                            .scope(|| deploy_image::ensure_default("fixture:1.16.0", "1.16.0"))
                            .unwrap_err();
                        if !error.contains("unauthorized") {
                            errors.push(error);
                        }
                    }
                    errors
                })
            })
            .collect();
        for worker in workers {
            failures.extend(worker.join().unwrap());
        }
    });
    for failure in &failures {
        eprintln!("{failure}");
    }
    println!(
        "{} incorrect errors in 1024 bounded image preflights",
        failures.len()
    );
    assert!(failures.is_empty());
}
