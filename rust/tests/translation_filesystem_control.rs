//! Independent native oracle SOURCE; execute only in JavaScript-gated CI.
use std::path::Path;

fn changed(path: &str, contents: &str, enabled: bool) -> std::io::Result<()> {
    if enabled {
        std::fs::write(path, contents)
    } else {
        std::fs::remove_file(path)
    }
}

async fn copied(from: &str, left: &str, right: &str, choose: bool) -> std::io::Result<()> {
    let loaded = tokio::fs::read_to_string(from).await?;
    if choose {
        tokio::fs::write(left, loaded).await
    } else {
        tokio::fs::write(right, loaded).await
    }
}

fn ordinary(path: &Path) -> &str {
    path.to_str().expect("fixture path must be Unicode")
}

#[test]
fn synchronous_branch_and_error_boundary() {
    let root = tempfile::tempdir().expect("fixture directory");
    let output = root.path().join("output");
    changed(ordinary(&output), "payload", true).expect("write");
    assert_eq!(std::fs::read(&output).expect("read"), b"payload");
    changed(ordinary(&output), "ignored", false).expect("remove");
    assert!(!output.exists());
    assert_eq!(changed(ordinary(&output), "ignored", false).expect_err("missing").kind(), std::io::ErrorKind::NotFound);
}

#[tokio::test]
async fn future_creation_is_lazy_selected_branch_is_exclusive_and_error_short_circuits() {
    let root = tempfile::tempdir().expect("fixture directory");
    let input = root.path().join("input");
    let left = root.path().join("left");
    let right = root.path().join("right");
    std::fs::write(&input, "payload").expect("input");
    let pending = copied(ordinary(&input), ordinary(&left), ordinary(&right), false);
    assert!(!left.exists());
    assert!(!right.exists());
    pending.await.expect("selected write");
    assert!(!left.exists());
    assert_eq!(std::fs::read(&right).expect("right"), b"payload");
    std::fs::remove_file(&input).expect("remove input");
    let failure = copied(ordinary(&input), ordinary(&left), ordinary(&right), true).await.expect_err("missing input");
    assert_eq!(failure.kind(), std::io::ErrorKind::NotFound);
    assert!(!left.exists());
    assert_eq!(std::fs::read(&right).expect("unchanged right"), b"payload");
}
