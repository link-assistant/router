use super::*;

#[test]
fn rotation_bounds_total_bytes_and_keeps_newest_records() {
    let directory = tempfile::tempdir().unwrap();
    let log = OperationalLog::open(directory.path(), false, Vec::new()).unwrap();
    {
        let mut state = log.state.lock().unwrap();
        state.max_bytes = 128;
        state.backups = 2;
    }
    for index in 0..40 {
        log.record(&format!("record {index}: {}", "x".repeat(30)))
            .unwrap();
    }
    log.record(&"💬".repeat(100)).unwrap();
    log.record("final exit").unwrap();
    let mut total = 0;
    for entry in fs::read_dir(directory.path()).unwrap() {
        let entry = entry.unwrap();
        if entry.file_name() == "operational.lock" {
            continue;
        }
        let bytes = fs::read(entry.path()).unwrap();
        assert!(bytes.len() <= 128);
        total += bytes.len();
        assert!(std::str::from_utf8(&bytes).is_ok());
    }
    assert!(total <= 384);
    assert!(
        fs::read_to_string(directory.path().join("operational.log"))
            .unwrap()
            .contains("final exit")
    );
    assert!(!directory.path().join("operational.log.3").exists());
}

#[test]
fn independent_writers_preserve_complete_records_and_redact_before_writing() {
    let directory = tempfile::tempdir().unwrap();
    let handles: Vec<_> = (0..4).map(|worker| {
        let log = OperationalLog::open(directory.path(), false, vec!["synthetic-cookie-value".into()]).unwrap();
        { let mut state = log.state.lock().unwrap(); state.max_bytes = 1024; }
        std::thread::spawn(move || {
            for index in 0..10 {
                log.record(&format!("worker={worker} index={index} cookie=synthetic-cookie-value token=la_sk_secret_value")).unwrap();
            }
        })
    }).collect();
    for handle in handles {
        handle.join().unwrap();
    }
    let records: String = fs::read_dir(directory.path())
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .filter(|path| path.file_name().unwrap() != "operational.lock")
        .map(|path| {
            let bytes = fs::read(&path).unwrap();
            assert!(bytes.len() <= 1024);
            String::from_utf8(bytes).unwrap()
        })
        .collect();
    assert!(directory.path().join("operational.log.1").exists());
    assert_eq!(records.lines().count(), 40);
    assert!(!records.contains("synthetic-cookie-value"));
    assert!(!records.contains("secret_value"));
    assert!(records.contains("[redacted]"));
}

#[cfg(unix)]
#[test]
fn logs_and_generations_are_owner_only_and_symlinks_are_refused() {
    use std::os::unix::fs::{PermissionsExt as _, symlink};
    let root = tempfile::tempdir().unwrap();
    let directory = root.path().join("logs");
    let log = OperationalLog::open(&directory, false, Vec::new()).unwrap();
    fs::set_permissions(
        directory.join("operational.log"),
        fs::Permissions::from_mode(0o644),
    )
    .unwrap();
    {
        let mut state = log.state.lock().unwrap();
        state.max_bytes = 64;
    }
    log.record("private record").unwrap();
    log.record("another private record forcing rotation")
        .unwrap();
    assert!(directory.join("operational.log.1").exists());
    assert_eq!(
        fs::metadata(&directory).unwrap().permissions().mode() & 0o777,
        0o700
    );
    for entry in fs::read_dir(&directory).unwrap() {
        assert_eq!(
            entry.unwrap().metadata().unwrap().permissions().mode() & 0o777,
            0o600
        );
    }
    let target = root.path().join("untouched");
    fs::write(&target, b"original").unwrap();
    fs::remove_file(directory.join("operational.log")).unwrap();
    symlink(&target, directory.join("operational.log")).unwrap();
    assert!(log.record("must not follow").is_err());
    assert_eq!(fs::read(target).unwrap(), b"original");
}
