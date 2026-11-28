#[cfg(unix)]
#[path = "../examples/host_library_consumer/scenario.rs"]
mod scenario;

#[cfg(unix)]
fn main() {
    scenario::run(|| std::path::PathBuf::from(env!("CARGO_BIN_EXE_router")));
}

#[cfg(not(unix))]
fn main() {
    println!("Host deployment consumer requires Unix process management");
}
