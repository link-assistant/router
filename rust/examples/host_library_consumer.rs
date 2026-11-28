//! A separate application consuming the Rust host deployment API (#702).
//! Run with `cargo run --example host_library_consumer` after building the CLI.

#[cfg(unix)]
#[path = "host_library_consumer/scenario.rs"]
mod scenario;

#[cfg(unix)]
fn main() {
    scenario::run(|| {
        std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("router")
    });
}

#[cfg(not(unix))]
fn main() {
    println!("Host deployment consumer requires Unix process management");
}
