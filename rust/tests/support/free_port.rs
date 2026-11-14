//! A loopback port for a router child process to bind.

/// A free loopback port that no other caller in this test binary was given.
///
/// The OS picks the port, since only it knows what is in use, but the
/// listener is closed before the child binds the number, so a parallel test
/// can take the port in between. Handing each port out once removes the
/// collisions between this binary's own routers, which would otherwise answer
/// each other's requests. A child that still loses its port to another
/// listener exits, and the caller starts it again on another port.
pub fn free_port() -> u16 {
    use std::collections::HashSet;
    use std::sync::{Mutex, OnceLock};
    static HANDED_OUT: OnceLock<Mutex<HashSet<u16>>> = OnceLock::new();
    let seen = HANDED_OUT.get_or_init(|| Mutex::new(HashSet::new()));
    for _ in 0..4_000 {
        let port = std::net::TcpListener::bind("127.0.0.1:0")
            .expect("bind an ephemeral port")
            .local_addr()
            .expect("ephemeral address")
            .port();
        if seen.lock().expect("port registry").insert(port) {
            return port;
        }
    }
    panic!("no unused ephemeral port")
}
