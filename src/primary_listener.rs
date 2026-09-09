//! Explicit primary listener configuration.

use crate::route_contract::ListenerKind;
use crate::tls::TlsSetup;
use std::net::SocketAddr;

/// Wire transport used by one primary listener.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ListenerTransport {
    /// Plain HTTP.
    Http,
    /// HTTPS using Router's configured certificate pair.
    Tls,
}

impl ListenerTransport {
    /// URL scheme exposed by this transport.
    #[must_use]
    pub const fn scheme(self) -> &'static str {
        match self {
            Self::Http => "http",
            Self::Tls => "https",
        }
    }
}

/// One additional network-facing primary listener.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PrimaryListenerConfig {
    /// Concrete address to bind.
    pub address: SocketAddr,
    /// Canonical route set exposed on this socket.
    pub kind: ListenerKind,
    /// Plain HTTP or fail-closed TLS.
    pub transport: ListenerTransport,
}

impl std::str::FromStr for PrimaryListenerConfig {
    type Err = String;

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        let invalid =
            || format!("invalid listener {raw:?}; expected ADDR=combined|inference-only,http|tls");
        let (address, selection) = raw.split_once('=').ok_or_else(invalid)?;
        let (kind, transport) = selection.split_once(',').ok_or_else(invalid)?;
        if transport.contains(',') {
            return Err(invalid());
        }
        let address = SocketAddr::from_str(address.trim()).map_err(|_| invalid())?;
        let kind = match kind.trim() {
            "combined" => ListenerKind::Combined,
            "inference-only" => ListenerKind::InferenceOnly,
            _ => return Err(invalid()),
        };
        let transport = match transport.trim() {
            "http" => ListenerTransport::Http,
            "tls" => ListenerTransport::Tls,
            _ => return Err(invalid()),
        };
        Ok(Self {
            address,
            kind,
            transport,
        })
    }
}

/// A primary socket reserved during atomic startup.
pub struct BoundPrimaryListener {
    config: PrimaryListenerConfig,
    listener: tokio::net::TcpListener,
    tls: Option<axum_server::tls_rustls::RustlsConfig>,
}

impl BoundPrimaryListener {
    /// Route and transport configuration for this socket.
    #[must_use]
    pub const fn config(&self) -> PrimaryListenerConfig {
        self.config
    }

    /// The actual address selected by the operating system.
    pub fn local_addr(&self) -> std::io::Result<SocketAddr> {
        self.listener.local_addr()
    }

    /// Serve this prebound listener until the shared shutdown notice arrives.
    ///
    /// # Errors
    ///
    /// Returns an error when the HTTP or HTTPS server fails.
    pub async fn serve(
        self,
        app: axum::Router,
        shutdown: impl std::future::Future<Output = ()> + Send + 'static,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let address = self.listener.local_addr()?;
        tracing::info!(
            "Listening on {}://{} ({:?})",
            self.config.transport.scheme(),
            address,
            self.config.kind
        );
        let result = if let Some(tls) = self.tls {
            crate::tls::serve_prebound_https(self.listener, app, tls, shutdown).await
        } else {
            axum::serve(self.listener, app)
                .with_graceful_shutdown(shutdown)
                .await?;
            Ok(())
        };
        tracing::info!(
            "Stopped {}://{} ({:?})",
            self.config.transport.scheme(),
            address,
            self.config.kind
        );
        result
    }
}

/// Reserve every primary socket before any listener starts serving.
///
/// # Errors
///
/// Returns an error when TLS is not configured or any socket cannot be bound.
pub async fn bind_all(
    listeners: &[PrimaryListenerConfig],
    tls_setup: &TlsSetup,
) -> Result<Vec<BoundPrimaryListener>, String> {
    let mut bound = Vec::with_capacity(listeners.len());
    for config in listeners {
        let tls = match (config.transport, tls_setup) {
            (ListenerTransport::Http, _) => None,
            (ListenerTransport::Tls, TlsSetup::Enabled { cert, key }) => {
                Some(crate::tls::load_config(cert, key).await?)
            }
            (ListenerTransport::Tls, TlsSetup::Disabled) => {
                return Err(format!(
                    "listener {} requires TLS; configure TLS_CERT_FILE and TLS_KEY_FILE or TLS_SELF_SIGNED=1",
                    config.address
                ));
            }
        };
        let listener = tokio::net::TcpListener::bind(config.address)
            .await
            .map_err(|error| format!("could not bind listener {}: {error}", config.address))?;
        bound.push(BoundPrimaryListener {
            config: *config,
            listener,
            tls,
        });
    }
    Ok(bound)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn listener_grammar_selects_one_canonical_route_set_and_transport() {
        assert_eq!(
            "127.0.0.1:8443=inference-only,tls".parse(),
            Ok(PrimaryListenerConfig {
                address: ([127, 0, 0, 1], 8443).into(),
                kind: ListenerKind::InferenceOnly,
                transport: ListenerTransport::Tls,
            })
        );
        assert_eq!(
            "[::1]:8080=combined,http".parse(),
            Ok(PrimaryListenerConfig {
                address: ([0, 0, 0, 0, 0, 0, 0, 1], 8080).into(),
                kind: ListenerKind::Combined,
                transport: ListenerTransport::Http,
            })
        );
    }

    #[tokio::test]
    async fn every_http_socket_is_reserved_before_serving() {
        let listeners = [
            PrimaryListenerConfig {
                address: ([127, 0, 0, 1], 0).into(),
                kind: ListenerKind::Combined,
                transport: ListenerTransport::Http,
            },
            PrimaryListenerConfig {
                address: ([127, 0, 0, 1], 0).into(),
                kind: ListenerKind::InferenceOnly,
                transport: ListenerTransport::Http,
            },
        ];

        let bound = bind_all(&listeners, &TlsSetup::Disabled)
            .await
            .expect("both sockets should be reserved");
        assert_eq!(bound.len(), 2);
        assert_ne!(
            bound[0].local_addr().unwrap(),
            bound[1].local_addr().unwrap()
        );
    }

    #[tokio::test]
    async fn an_explicit_tls_listener_loads_its_certificate_before_serving() {
        let data_dir = tempfile::tempdir().expect("data directory");
        let (cert, key) = crate::tls::ensure_generated(
            data_dir.path(),
            &crate::tls::generated_subject_names("127.0.0.1"),
        )
        .expect("generate test certificate");
        let listeners = [PrimaryListenerConfig {
            address: ([127, 0, 0, 1], 0).into(),
            kind: ListenerKind::InferenceOnly,
            transport: ListenerTransport::Tls,
        }];

        let bound = bind_all(&listeners, &TlsSetup::Enabled { cert, key })
            .await
            .expect("TLS listener should be fully prepared");
        assert_eq!(bound[0].config(), listeners[0]);
        assert_ne!(bound[0].local_addr().unwrap().port(), 0);
    }

    #[tokio::test]
    async fn a_failed_later_bind_releases_every_earlier_socket() {
        let first = std::net::TcpListener::bind("127.0.0.1:0")
            .expect("reserve first address")
            .local_addr()
            .expect("first address");
        let occupied = std::net::TcpListener::bind("127.0.0.1:0").expect("occupy second address");
        let second = occupied.local_addr().expect("second address");
        let listeners = [first, second].map(|address| PrimaryListenerConfig {
            address,
            kind: ListenerKind::Combined,
            transport: ListenerTransport::Http,
        });

        let Err(error) = bind_all(&listeners, &TlsSetup::Disabled).await else {
            panic!("the occupied second address must fail startup");
        };
        assert!(error.contains(&second.to_string()), "{error}");
        std::net::TcpListener::bind(first).expect("the earlier socket must have been released");
    }

    #[tokio::test]
    async fn tls_transport_never_falls_back_to_plaintext() {
        let listeners = [PrimaryListenerConfig {
            address: ([127, 0, 0, 1], 0).into(),
            kind: ListenerKind::InferenceOnly,
            transport: ListenerTransport::Tls,
        }];
        let Err(error) = bind_all(&listeners, &TlsSetup::Disabled).await else {
            panic!("TLS without a certificate must fail closed");
        };
        assert!(error.contains("requires TLS"), "{error}");
    }

    #[tokio::test]
    async fn a_bound_tls_listener_rejects_plain_http() {
        let data_dir = tempfile::tempdir().expect("data directory");
        let (cert, key) = crate::tls::ensure_generated(
            data_dir.path(),
            &crate::tls::generated_subject_names("127.0.0.1"),
        )
        .expect("generate test certificate");
        let listeners = [PrimaryListenerConfig {
            address: ([127, 0, 0, 1], 0).into(),
            kind: ListenerKind::InferenceOnly,
            transport: ListenerTransport::Tls,
        }];
        let listener = bind_all(
            &listeners,
            &TlsSetup::Enabled {
                cert: cert.clone(),
                key,
            },
        )
        .await
        .expect("prepare TLS listener")
        .pop()
        .expect("one listener");
        let port = listener.local_addr().expect("bound address").port();
        let serving = tokio::spawn(listener.serve(
            axum::Router::new().route("/health", axum::routing::get(|| async { "ok" })),
            std::future::pending(),
        ));

        let trusted = reqwest::Client::builder()
            .add_root_certificate(
                reqwest::Certificate::from_pem(&std::fs::read(cert).expect("read certificate"))
                    .expect("parse certificate"),
            )
            .build()
            .expect("TLS client");
        let url = format!("https://127.0.0.1:{port}/health");
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(10);
        while trusted.get(&url).send().await.is_err() {
            assert!(
                std::time::Instant::now() < deadline,
                "TLS never became ready"
            );
            tokio::time::sleep(std::time::Duration::from_millis(25)).await;
        }
        let plaintext = reqwest::Client::new()
            .get(format!("http://127.0.0.1:{port}/health"))
            .timeout(std::time::Duration::from_secs(2))
            .send()
            .await;
        serving.abort();

        assert!(
            plaintext.is_err(),
            "a TLS listener must never answer plaintext"
        );
    }
}
