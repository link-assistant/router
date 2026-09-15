//! Connection-preserving front door for remote deployments.
//!
//! A remote update cannot replace the container holding the published port:
//! doing so necessarily leaves a bind gap and kills in-flight responses.  The
//! deployment therefore leaves this deliberately small TCP relay on the real
//! ports.  Every accepted connection reads the current backend from an atomic
//! state file.  Existing connections retain the backend they already selected,
//! so replacing that file is the cutover and draining the old connection count
//! is the shutdown barrier.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use tokio::io::copy_bidirectional;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;

/// Environment which elects the binary into relay mode before CLI parsing.
pub const STATE_ENV: &str = "ROUTER_DEPLOY_RELAY_STATE";
/// Semicolon-separated `LISTEN_ADDRESS,BACKEND_PORT` relay bindings.
pub const LISTENERS_ENV: &str = "ROUTER_DEPLOY_RELAY_LISTENERS";

#[derive(Clone, Debug, Eq, PartialEq)]
struct Binding {
    listen: String,
    backend_port: u16,
}

fn parse_bindings(raw: &str) -> Result<Vec<Binding>, String> {
    let bindings = raw
        .split(';')
        .filter(|part| !part.trim().is_empty())
        .map(|part| {
            let (listen, port) = part
                .rsplit_once(',')
                .ok_or_else(|| format!("invalid relay listener {part:?}; expected ADDR,PORT"))?;
            listen
                .parse::<std::net::SocketAddr>()
                .map_err(|_| format!("invalid relay address {listen:?}"))?;
            let backend_port = port
                .parse::<u16>()
                .map_err(|_| format!("invalid relay backend port {port:?}"))?;
            Ok(Binding {
                listen: listen.to_string(),
                backend_port,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    if bindings.is_empty() {
        return Err("the deployment relay has no listeners".to_string());
    }
    Ok(bindings)
}

fn valid_backend(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
}

fn read_backend(state: &Path) -> Result<String, String> {
    let backend = std::fs::read_to_string(state)
        .map_err(|error| format!("could not read relay state {}: {error}", state.display()))?;
    let backend = backend.trim();
    if !valid_backend(backend) {
        return Err(format!(
            "relay state {} contains an invalid backend name",
            state.display()
        ));
    }
    Ok(backend.to_string())
}

#[derive(Debug)]
struct Connections {
    directory: PathBuf,
    counts: BTreeMap<String, u64>,
}

impl Connections {
    fn new(state: &Path) -> Result<Self, String> {
        let parent = state
            .parent()
            .ok_or_else(|| "relay state has no parent directory".to_string())?;
        let directory = parent.join("connections");
        std::fs::create_dir_all(&directory).map_err(|error| {
            format!(
                "could not create relay connection directory {}: {error}",
                directory.display()
            )
        })?;
        // A relay process cannot inherit TCP streams across a restart. Reset
        // only validated counter files so an interrupted old process cannot
        // leave a deployment waiting forever for connections which no longer
        // exist.
        for entry in std::fs::read_dir(&directory).map_err(|error| {
            format!(
                "could not read relay connection directory {}: {error}",
                directory.display()
            )
        })? {
            let entry = entry.map_err(|error| {
                format!(
                    "could not read a relay connection entry in {}: {error}",
                    directory.display()
                )
            })?;
            let name = entry.file_name();
            let Some(name) = name.to_str().filter(|name| valid_backend(name)) else {
                continue;
            };
            if entry
                .file_type()
                .map_err(|error| format!("could not inspect relay counter {name}: {error}"))?
                .is_file()
            {
                let path = entry.path();
                crate::durable_file::atomic_write_owner_only(&path, b"0")
                    .map_err(|error| crate::durable_file::describe_write_failure(&path, &error))?;
            }
        }
        Ok(Self {
            directory,
            counts: BTreeMap::new(),
        })
    }

    fn change(&mut self, backend: &str, change: i8) -> Result<(), String> {
        let value = self.counts.entry(backend.to_string()).or_default();
        let previous = *value;
        if change > 0 {
            *value = value.saturating_add(1);
        } else {
            *value = value.saturating_sub(1);
        }
        let path = self.directory.join(backend);
        if let Err(error) =
            crate::durable_file::atomic_write_owner_only(&path, value.to_string().as_bytes())
        {
            *value = previous;
            return Err(crate::durable_file::describe_write_failure(&path, &error));
        }
        Ok(())
    }
}

async fn relay_connection(
    mut client: TcpStream,
    state: &Path,
    backend_port: u16,
    connections: Arc<Mutex<Connections>>,
) -> Result<(), String> {
    let backend = read_backend(state)?;
    // Publish the connection before attempting the upstream connect.  Otherwise
    // cutover could observe zero old connections and remove the backend while a
    // just-accepted stream was still connecting to it.
    connections.lock().await.change(&backend, 1)?;
    let result = async {
        let mut upstream = TcpStream::connect((backend.as_str(), backend_port))
            .await
            .map_err(|error| format!("could not connect to {backend}:{backend_port}: {error}"))?;
        copy_bidirectional(&mut client, &mut upstream)
            .await
            .map(|_| ())
            .map_err(|error| format!("relay stream failed: {error}"))
    }
    .await;
    let decrement = connections.lock().await.change(&backend, -1);
    if let Err(error) = decrement {
        tracing::error!("{error}");
    }
    result
}

async fn serve_binding(
    binding: Binding,
    state: PathBuf,
    connections: Arc<Mutex<Connections>>,
) -> Result<(), String> {
    let listener = TcpListener::bind(&binding.listen)
        .await
        .map_err(|error| format!("could not bind relay listener {}: {error}", binding.listen))?;
    tracing::info!(
        "Deployment relay listening on {} for backend port {}",
        binding.listen,
        binding.backend_port
    );
    loop {
        let (client, _) = listener
            .accept()
            .await
            .map_err(|error| format!("deployment relay accept failed: {error}"))?;
        let state = state.clone();
        let connections = Arc::clone(&connections);
        let port = binding.backend_port;
        tokio::spawn(async move {
            if let Err(error) = relay_connection(client, &state, port, connections).await {
                tracing::warn!("{error}");
            }
        });
    }
}

/// Run relay mode when its opt-in environment is present.
///
/// `Ok(None)` means this is an ordinary Router invocation.
pub async fn run_from_env() -> Result<Option<()>, String> {
    let Some(state) = std::env::var_os(STATE_ENV) else {
        return Ok(None);
    };
    let state = PathBuf::from(state);
    // Fail before binding a public port if the state is missing or malformed.
    read_backend(&state)?;
    let raw = std::env::var(LISTENERS_ENV)
        .map_err(|_| format!("{LISTENERS_ENV} is required in deployment relay mode"))?;
    let bindings = parse_bindings(&raw)?;
    let connections = Arc::new(Mutex::new(Connections::new(&state)?));
    let servers = bindings
        .into_iter()
        .map(|binding| serve_binding(binding, state.clone(), Arc::clone(&connections)));
    futures_util::future::try_join_all(servers).await?;
    Ok(Some(()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    #[test]
    fn listener_configuration_is_explicit_and_validated() {
        assert_eq!(
            parse_bindings("0.0.0.0:8080,8080;[::]:8443,8443").unwrap(),
            vec![
                Binding {
                    listen: "0.0.0.0:8080".into(),
                    backend_port: 8080,
                },
                Binding {
                    listen: "[::]:8443".into(),
                    backend_port: 8443,
                }
            ]
        );
        assert!(parse_bindings("").is_err());
        assert!(parse_bindings("everywhere,8080").is_err());
        assert!(parse_bindings("127.0.0.1:1,not-a-port").is_err());
    }

    #[test]
    fn state_accepts_only_a_container_name_not_an_address_or_path() {
        let directory = tempfile::tempdir().unwrap();
        let state = directory.path().join("current");
        for good in ["router-deploy-a", "candidate_2", "release.3"] {
            std::fs::write(&state, format!("{good}\n")).unwrap();
            assert_eq!(read_backend(&state).unwrap(), good);
        }
        for bad in ["", "../../etc/passwd", "host:8080", "two names"] {
            std::fs::write(&state, bad).unwrap();
            assert!(read_backend(&state).is_err(), "accepted {bad:?}");
        }
    }

    #[test]
    fn connection_counts_are_durable_and_never_underflow() {
        let directory = tempfile::tempdir().unwrap();
        let state = directory.path().join("current");
        let mut connections = Connections::new(&state).unwrap();
        connections.change("candidate", 1).unwrap();
        connections.change("candidate", 1).unwrap();
        assert_eq!(
            std::fs::read_to_string(directory.path().join("connections/candidate")).unwrap(),
            "2"
        );
        connections.change("candidate", -1).unwrap();
        connections.change("candidate", -1).unwrap();
        connections.change("candidate", -1).unwrap();
        assert_eq!(
            std::fs::read_to_string(directory.path().join("connections/candidate")).unwrap(),
            "0"
        );
    }

    #[test]
    fn relay_restart_resets_counts_for_streams_which_cannot_survive_it() {
        let directory = tempfile::tempdir().unwrap();
        let state = directory.path().join("current");
        let counters = directory.path().join("connections");
        std::fs::create_dir(&counters).unwrap();
        std::fs::write(counters.join("old-backend"), b"3").unwrap();
        std::fs::write(counters.join("not a backend"), b"leave-me").unwrap();

        let connections = Connections::new(&state).unwrap();

        assert!(connections.counts.is_empty());
        assert_eq!(
            std::fs::read_to_string(counters.join("old-backend")).unwrap(),
            "0"
        );
        assert_eq!(
            std::fs::read_to_string(counters.join("not a backend")).unwrap(),
            "leave-me"
        );
    }

    #[test]
    fn failed_count_write_does_not_corrupt_the_in_memory_count() {
        let directory = tempfile::tempdir().unwrap();
        let state = directory.path().join("current");
        let mut connections = Connections::new(&state).unwrap();
        let blocked = directory.path().join("not-a-directory");
        std::fs::write(&blocked, b"blocked").unwrap();
        connections.directory = blocked;
        assert!(connections.change("candidate", 1).is_err());
        assert_eq!(connections.counts.get("candidate"), Some(&0));
    }

    async fn tagged_backend(listener: TcpListener, tag: u8) {
        loop {
            let Ok((mut stream, _)) = listener.accept().await else {
                return;
            };
            tokio::spawn(async move {
                let mut byte = [0_u8; 1];
                while stream.read_exact(&mut byte).await.is_ok() {
                    if stream.write_all(&[tag, byte[0]]).await.is_err() {
                        break;
                    }
                }
            });
        }
    }

    async fn exchange(stream: &mut TcpStream, byte: u8) -> [u8; 2] {
        stream.write_all(&[byte]).await.unwrap();
        let mut answer = [0_u8; 2];
        stream.read_exact(&mut answer).await.unwrap();
        answer
    }

    #[tokio::test]
    async fn failed_upstream_connect_releases_its_published_count() {
        let unavailable = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let backend_port = unavailable.local_addr().unwrap().port();
        drop(unavailable);
        let clients = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let client_address = clients.local_addr().unwrap();
        let client = TcpStream::connect(client_address).await.unwrap();
        let (accepted, _) = clients.accept().await.unwrap();
        let directory = tempfile::tempdir().unwrap();
        let state = directory.path().join("current");
        std::fs::write(&state, "127.0.0.1\n").unwrap();
        let connections = Arc::new(Mutex::new(Connections::new(&state).unwrap()));

        assert!(
            relay_connection(accepted, &state, backend_port, Arc::clone(&connections))
                .await
                .is_err()
        );
        assert_eq!(connections.lock().await.counts.get("127.0.0.1"), Some(&0));
        assert_eq!(
            std::fs::read_to_string(directory.path().join("connections/127.0.0.1")).unwrap(),
            "0"
        );
        drop(client);
    }

    #[tokio::test]
    async fn cutover_keeps_existing_connections_and_sends_new_ones_to_the_candidate() {
        tokio::time::timeout(std::time::Duration::from_secs(3), async {
            let old = TcpListener::bind("127.0.0.1:0").await.unwrap();
            let backend_port = old.local_addr().unwrap().port();
            let new = TcpListener::bind(("127.0.0.2", backend_port))
                .await
                .unwrap();
            let old_task = tokio::spawn(tagged_backend(old, b'o'));
            let new_task = tokio::spawn(tagged_backend(new, b'n'));

            let directory = tempfile::tempdir().unwrap();
            let state = directory.path().join("current");
            std::fs::write(&state, "127.0.0.1\n").unwrap();
            let connections = Arc::new(Mutex::new(Connections::new(&state).unwrap()));
            let front = TcpListener::bind("127.0.0.1:0").await.unwrap();
            let front_address = front.local_addr().unwrap();
            let state_for_relay = state.clone();
            let relay_connections = Arc::clone(&connections);
            let relay_task = tokio::spawn(async move {
                loop {
                    let (client, _) = front.accept().await.unwrap();
                    let state = state_for_relay.clone();
                    let connections = Arc::clone(&relay_connections);
                    tokio::spawn(async move {
                        relay_connection(client, &state, backend_port, connections)
                            .await
                            .unwrap();
                    });
                }
            });

            let mut established = TcpStream::connect(front_address).await.unwrap();
            assert_eq!(exchange(&mut established, b'a').await, [b'o', b'a']);
            crate::durable_file::atomic_write_owner_only(&state, b"127.0.0.2\n").unwrap();

            // The stream accepted before the atomic state replacement remains
            // attached to the old backend; a new stream observes the candidate.
            assert_eq!(exchange(&mut established, b'b').await, [b'o', b'b']);
            let mut arrived_after = TcpStream::connect(front_address).await.unwrap();
            assert_eq!(exchange(&mut arrived_after, b'c').await, [b'n', b'c']);
            assert_eq!(
                std::fs::read_to_string(directory.path().join("connections/127.0.0.1")).unwrap(),
                "1"
            );
            assert_eq!(
                std::fs::read_to_string(directory.path().join("connections/127.0.0.2")).unwrap(),
                "1"
            );

            drop(established);
            drop(arrived_after);
            loop {
                let counts = connections.lock().await;
                if counts.counts.values().all(|count| *count == 0) {
                    break;
                }
                drop(counts);
                tokio::task::yield_now().await;
            }
            relay_task.abort();
            old_task.abort();
            new_task.abort();
        })
        .await
        .expect("relay cutover test timed out");
    }
}
