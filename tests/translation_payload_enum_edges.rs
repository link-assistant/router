//! Real payload-enum regression oracles for translation work.
//! These tests run in gated CI only; no local Rust execution is authorized.

use link_assistant_router::subscription::InstallDocumentResult;
use std::path::PathBuf;

#[test]
fn install_result_equality_preserves_variants_and_exact_path_payloads() {
    let paths = ["", " ", "token", "Token", "e\u{301}", "é", "Ω😀", "a\0b"];
    for (left_index, left) in paths.iter().enumerate() {
        for (right_index, right) in paths.iter().enumerate() {
            let expected = left_index == right_index;
            assert_eq!(
                InstallDocumentResult::Installed(PathBuf::from(*left))
                    == InstallDocumentResult::Installed(PathBuf::from(*right)),
                expected
            );
            assert_eq!(
                InstallDocumentResult::AlreadyPresent(PathBuf::from(*left))
                    == InstallDocumentResult::AlreadyPresent(PathBuf::from(*right)),
                expected
            );
            assert_ne!(
                InstallDocumentResult::Installed(PathBuf::from(*left)),
                InstallDocumentResult::AlreadyPresent(PathBuf::from(*right))
            );
        }
    }
}

#[test]
fn install_result_clone_retains_each_variant_and_all_payload_bytes() {
    for original in ["", " ", "token", "Token", "e\u{301}", "é", "Ω😀", "a\0b"] {
        let installed = InstallDocumentResult::Installed(PathBuf::from(original));
        let present = InstallDocumentResult::AlreadyPresent(PathBuf::from(original));
        let cloned_installed = installed.clone();
        let cloned_present = present.clone();
        assert_eq!(cloned_installed, installed);
        assert_eq!(cloned_present, present);
        let InstallDocumentResult::Installed(path) = cloned_installed else {
            panic!("clone changed the installed variant");
        };
        assert_eq!(path.as_os_str().as_encoded_bytes(), original.as_bytes());
        let InstallDocumentResult::AlreadyPresent(path) = cloned_present else {
            panic!("clone changed the already-present variant");
        };
        assert_eq!(path.as_os_str().as_encoded_bytes(), original.as_bytes());
    }
}

#[cfg(unix)]
#[test]
fn install_result_never_collapses_non_utf8_path_payloads() {
    use std::ffi::OsString;
    use std::os::unix::ffi::{OsStrExt, OsStringExt};

    let first = vec![b'f', 0x80, 0];
    let second = vec![b'f', 0x81, 0];
    let first_path = PathBuf::from(OsString::from_vec(first.clone()));
    let second_path = PathBuf::from(OsString::from_vec(second));
    let installed = InstallDocumentResult::Installed(first_path);
    let different = InstallDocumentResult::Installed(second_path);
    assert_ne!(installed, different);
    let cloned = installed.clone();
    assert_eq!(cloned, installed);
    let InstallDocumentResult::Installed(path) = cloned else {
        panic!("clone changed the non-UTF8 installed variant");
    };
    assert_eq!(path.as_os_str().as_bytes(), first.as_slice());
}
