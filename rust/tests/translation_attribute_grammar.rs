//! Independent native attribute examples. Gated CI only; no local Rust execution.

#[allow(dead_code)]
#[repr(C)]
#[derive(Clone, Copy)]
struct Packet {
    left: u8,
    right: u8,
}

#[inline(always)]
#[rustfmt::skip]
fn combine(packet: Packet) -> u8 { packet.left ^ packet.right }

#[test]
fn ordinary_empty_and_delimited_attributes_preserve_values_and_copy() {
    let packet = Packet { left: 255, right: 15 };
    assert_eq!(combine(packet), 240);
    assert_eq!(combine(packet), 240);
}

#[test]
fn a_written_tool_path_does_not_resolve_through_a_shadowing_type_namespace() {
    use std::io::Read;
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    struct Scratch(std::path::PathBuf);
    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
    let unique = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let scratch = Scratch(std::env::temp_dir().join(format!(
        "router-tool-shadow-{}-{unique}", std::process::id()
    )));
    std::fs::create_dir(&scratch.0).unwrap();
    let source = scratch.0.join("tool_shadow.rs");
    std::fs::write(&source, "mod rustfmt {}\n#[rustfmt::skip]\npub fn value()->u8{1}\n").unwrap();
    let compiler = std::env::var_os("RUSTC").unwrap_or_else(|| "rustc".into());
    struct NativeChild(std::process::Child);
    impl Drop for NativeChild {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }
    let mut child = NativeChild(Command::new(compiler)
        .args(["--crate-type=lib", "--edition=2021", "--emit=metadata", "-o"])
        .arg(scratch.0.join("tool_shadow.rmeta"))
        .arg(&source)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .expect("gated CI Rust compiler must start"));
    let started = Instant::now();
    let status = loop {
        if let Some(status) = child.0.try_wait().unwrap() {
            break status;
        }
        if started.elapsed() > Duration::from_secs(20) {
            let _ = child.0.kill();
            let _ = child.0.wait();
            panic!("bounded native tool-prefix oracle timed out");
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    let mut stderr = String::new();
    child.0.stderr.take().unwrap().take(1_048_577).read_to_string(&mut stderr).unwrap();
    assert!(stderr.len() <= 1_048_576, "native oracle output bound");
    assert!(!status.success(), "shadowing module must not grant tool ownership");
    assert!(stderr.contains("rustfmt") && stderr.contains("skip"), "{stderr}");
}
