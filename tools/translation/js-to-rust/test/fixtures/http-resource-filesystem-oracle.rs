// Independent Rust oracle SOURCE. CI only after every JavaScript gate passes.
use std::fs;

#[test]
fn filesystem_unicode_errors_and_order_have_native_source_cases() {
    let nonce = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
    let root = std::env::temp_dir().join(format!("router-filesystem-oracle-{}-{nonce}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    let origin = root.join("origin");
    let target = root.join("target");
    fs::write(&origin, " é😀 ").unwrap();
    let contents = fs::read_to_string(&origin).unwrap();
    fs::write(&target, contents.trim()).unwrap();
    assert_eq!(fs::read_to_string(&target).unwrap(), "é😀");
    assert_eq!(fs::read_to_string(root.join("missing")).unwrap_err().kind(), std::io::ErrorKind::NotFound);
    let moved = root.join("moved");
    fs::rename(&target, &moved).unwrap();
    assert!(!target.exists());
    assert_eq!(fs::read_to_string(moved).unwrap(), "é😀");
    fs::remove_dir_all(root).unwrap();
}
