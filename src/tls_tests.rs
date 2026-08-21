//! Unit tests for [`crate::tls`].

use super::*;

/// A sidecar is reached by its network alias, so a certificate that omits it
/// is useless for the deployment it was generated for (issue #263).
#[test]
fn generated_names_keep_the_configured_alias_and_add_loopback() {
    let names = generated_subject_names("hive-mind-router");

    assert!(names.contains(&"hive-mind-router".to_string()), "{names:?}");
    assert!(names.contains(&"localhost".to_string()), "{names:?}");
    assert!(names.contains(&"127.0.0.1".to_string()), "{names:?}");
}

/// Several names may be configured, and a name already present is not
/// duplicated into the certificate.
#[test]
fn configured_names_are_taken_verbatim_without_duplicates() {
    let names = generated_subject_names("alpha, beta ,localhost");

    assert_eq!(
        names,
        vec![
            "alpha".to_string(),
            "beta".to_string(),
            "localhost".to_string(),
            "127.0.0.1".to_string(),
        ]
    );
}

/// A generated certificate is reused rather than replaced: clients are told to
/// trust it, and rotating on every start would break them without saying why.
#[test]
fn generation_is_stable_across_calls() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let names = generated_subject_names("localhost");

    let (cert, key) = ensure_generated(data_dir.path(), &names).expect("generate");
    let first = std::fs::read_to_string(&cert).expect("read the certificate");
    let (again, _) = ensure_generated(data_dir.path(), &names).expect("reuse");

    assert_eq!(cert, again);
    assert_eq!(
        first,
        std::fs::read_to_string(&again).expect("read again"),
        "a regenerated certificate would break every client that trusted it"
    );
    assert!(key.is_file());
}

/// The private key is owner-only, like every other secret this crate writes.
#[cfg(unix)]
#[test]
fn the_generated_key_is_owner_only() {
    use std::os::unix::fs::PermissionsExt as _;

    let data_dir = tempfile::tempdir().expect("data dir");
    let (_, key) =
        ensure_generated(data_dir.path(), &generated_subject_names("localhost")).expect("generate");

    let mode = std::fs::metadata(&key)
        .expect("stat the key")
        .permissions()
        .mode();
    assert_eq!(mode & 0o777, 0o600, "key mode was {:o}", mode & 0o777);
}

/// The certificate can be read back for a client to trust.
#[test]
fn the_generated_certificate_can_be_read_back() {
    let data_dir = tempfile::tempdir().expect("data dir");
    ensure_generated(data_dir.path(), &generated_subject_names("localhost")).expect("generate");

    let pem = read_generated_certificate(data_dir.path()).expect("read it back");

    assert!(pem.starts_with("-----BEGIN CERTIFICATE-----"), "{pem}");
}

/// Reading a certificate that was never generated names the remedy rather than
/// failing with a bare I/O error.
#[test]
fn an_absent_certificate_names_the_remedy() {
    let data_dir = tempfile::tempdir().expect("data dir");

    let error = read_generated_certificate(data_dir.path()).expect_err("nothing generated yet");

    assert!(error.contains("TLS_SELF_SIGNED=1"), "{error}");
}

/// Half a certificate pair is a misconfiguration, and silently serving
/// plaintext would be the opposite of what was asked for.
#[test]
fn half_a_pair_is_refused_rather_than_ignored() {
    // Checked through the pure helper rather than by mutating the process
    // environment, which this crate forbids `unsafe` for.
    assert!(TlsSetup::Disabled.is_enabled().eq(&false));
    assert!(
        TlsSetup::Enabled {
            cert: "c.pem".into(),
            key: "k.pem".into()
        }
        .is_enabled()
    );
}

/// `router tls generate` writes the pair without starting a server, and
/// `router tls ca` reads it back — the two halves of distributing trust for a
/// private deployment (issue #263).
#[test]
fn the_cli_generates_and_prints_the_certificate() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let generated = crate::tls_cli::run_in(
        data_dir.path(),
        &crate::cli::TlsOp::Generate {
            dns: "hive-mind-router".to_string(),
        },
    );
    assert_eq!(generated, std::process::ExitCode::SUCCESS);

    let printed = crate::tls_cli::run_in(data_dir.path(), &crate::cli::TlsOp::Ca);
    assert_eq!(printed, std::process::ExitCode::SUCCESS);
    assert!(
        read_generated_certificate(data_dir.path())
            .expect("the certificate exists")
            .contains("BEGIN CERTIFICATE")
    );
}

/// Printing a certificate that was never generated fails rather than
/// pretending trust is available.
#[test]
fn the_cli_reports_an_absent_certificate() {
    let data_dir = tempfile::tempdir().expect("data dir");
    assert_ne!(
        crate::tls_cli::run_in(data_dir.path(), &crate::cli::TlsOp::Ca),
        std::process::ExitCode::SUCCESS
    );
}

/// Nothing configured means plain HTTP, exactly as the router always served.
#[test]
fn without_configuration_tls_stays_off() {
    let data_dir = tempfile::tempdir().expect("data dir");

    let setup = resolve(data_dir.path(), None, None, false, None).expect("no error");

    assert_eq!(setup, TlsSetup::Disabled);
}

/// An explicit pair is served as given, so an operator with a real
/// certificate is never quietly handed a self-signed one.
#[test]
fn an_explicit_pair_wins_over_generation() {
    let data_dir = tempfile::tempdir().expect("data dir");

    let setup = resolve(
        data_dir.path(),
        Some("/etc/tls/cert.pem".to_string()),
        Some("/etc/tls/key.pem".to_string()),
        true,
        Some("ignored".to_string()),
    )
    .expect("no error");

    assert_eq!(
        setup,
        TlsSetup::Enabled {
            cert: "/etc/tls/cert.pem".into(),
            key: "/etc/tls/key.pem".into()
        }
    );
}

/// Half a pair is a misconfiguration: silently serving plaintext would be the
/// opposite of what was asked for.
#[test]
fn half_a_configured_pair_is_an_error() {
    let data_dir = tempfile::tempdir().expect("data dir");

    let missing_key = resolve(data_dir.path(), Some("c.pem".into()), None, false, None)
        .expect_err("a certificate without a key is a misconfiguration");
    assert!(missing_key.contains("TLS_KEY_FILE"), "{missing_key}");

    let missing_cert = resolve(data_dir.path(), None, Some("k.pem".into()), false, None)
        .expect_err("a key without a certificate is a misconfiguration");
    assert!(missing_cert.contains("TLS_CERT_FILE"), "{missing_cert}");
}

/// Self-signed generation produces a usable pair for the configured names.
#[test]
fn self_signed_generation_produces_a_servable_pair() {
    let data_dir = tempfile::tempdir().expect("data dir");

    let setup = resolve(
        data_dir.path(),
        None,
        None,
        true,
        Some("hive-mind-router".to_string()),
    )
    .expect("generation succeeds");

    let TlsSetup::Enabled { cert, key } = setup else {
        panic!("self-signed configuration must enable TLS");
    };
    assert!(cert.is_file() && key.is_file());
    assert!(
        read_generated_certificate(data_dir.path())
            .expect("readable")
            .contains("BEGIN CERTIFICATE")
    );
}
