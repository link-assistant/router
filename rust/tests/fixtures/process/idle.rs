//! Native idle process fixture: no vendor CLI or copied OS executable.
fn main() {
    if std::env::args().any(|arg| arg == "--version") {
        std::process::exit(1);
    }
    std::thread::sleep(std::time::Duration::from_secs(3600));
}
