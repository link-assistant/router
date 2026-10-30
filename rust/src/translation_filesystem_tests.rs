//! Independent standard-library oracle source for the JS filesystem draft.
//! Execute in gated CI only; no local Rust invocation is authorized.
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

static NEXT: AtomicU64 = AtomicU64::new(0);

struct Directory(PathBuf);

impl Directory {
    fn create() -> Self {
        let path = std::env::temp_dir().join(format!(
            "router-filesystem-oracle-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&path).expect("create independent fixture directory");
        Self(path)
    }
}

impl Drop for Directory {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

#[test]
fn filesystem_bytes_are_not_utf8_text() {
    let root = Directory::create();
    let file = root.0.join("binary-雪");
    std::fs::write(&file, [0_u8, 127, 128, 255, 239, 187, 191]).unwrap();
    assert_eq!(std::fs::read(&file).unwrap(), [0, 127, 128, 255, 239, 187, 191]);
    assert_eq!(
        std::fs::read_to_string(&file).unwrap_err().kind(),
        std::io::ErrorKind::InvalidData
    );
    assert_eq!(
        std::fs::remove_dir_all(&file).unwrap_err().kind(),
        std::io::ErrorKind::NotADirectory
    );
    assert!(file.is_file());
}

#[test]
fn directory_link_and_rename_operations_preserve_order_and_bytes() {
    let root = Directory::create();
    let directory = root.0.join("directory");
    std::fs::create_dir(&directory).unwrap();
    assert_eq!(
        std::fs::create_dir(&directory).unwrap_err().kind(),
        std::io::ErrorKind::AlreadyExists
    );
    let first = directory.join("first");
    let alias = root.0.join("alias");
    let moved = directory.join("moved");
    std::fs::write(&first, [255_u8, 0]).unwrap();
    std::fs::hard_link(&first, &alias).unwrap();
    std::fs::rename(&first, &moved).unwrap();
    assert!(!first.exists());
    assert_eq!(std::fs::read(&alias).unwrap(), [255, 0]);
    assert_eq!(
        std::fs::remove_dir(&directory).unwrap_err().kind(),
        std::io::ErrorKind::DirectoryNotEmpty
    );
    std::fs::remove_dir_all(&directory).unwrap();
    assert_eq!(std::fs::read(&alias).unwrap(), [255, 0]);
}

#[cfg(unix)]
#[test]
fn recursive_root_symlink_removal_retains_the_target() {
    let root = Directory::create();
    let target = root.0.join("target");
    let link = root.0.join("link");
    std::fs::create_dir(&target).unwrap();
    std::fs::write(target.join("retained"), b"retained").unwrap();
    std::os::unix::fs::symlink(&target, &link).unwrap();
    std::fs::remove_dir_all(&link).unwrap();
    assert!(!link.exists());
    assert_eq!(std::fs::read(target.join("retained")).unwrap(), b"retained");
}

#[tokio::test]
async fn async_read_and_rename_keep_result_payloads() {
    let root = Directory::create();
    let before = root.0.join("before");
    let after = root.0.join("after");
    std::fs::write(&before, [0_u8, 128, 255]).unwrap();
    tokio::fs::rename(&before, &after).await.unwrap();
    assert_eq!(tokio::fs::read(&after).await.unwrap(), [0, 128, 255]);
    assert_eq!(
        tokio::fs::read(&before).await.unwrap_err().kind(),
        std::io::ErrorKind::NotFound
    );
}
