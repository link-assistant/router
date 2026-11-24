//! Fresh selected Router trust shared by HTTP and upgraded WebSocket streams.
use std::io::Read as _;
use std::path::{Path, PathBuf};
use tokio_tungstenite::tungstenite;

pub(super) fn selected_path(origin: &str, path: Option<&Path>) -> Result<Option<PathBuf>, String> {
    let Some(path) = path else { return Ok(None); };
    if reqwest::Url::parse(origin).map_err(|_| "invalid bridge origin")?.scheme() != "https" {
        return Err("selected Router CA requires an HTTPS bridge origin".into());
    }
    let path = if path.is_absolute() { path.to_path_buf() } else {
        crate::operation_context::current_dir().map_err(|error| error.to_string())?.join(path)
    };
    certificates(&path)?;
    Ok(Some(path))
}

fn certificates(path: &Path) -> Result<Vec<reqwest::Certificate>, String> {
    for ancestor in path.ancestors() {
        if std::fs::symlink_metadata(ancestor).map_err(|error| error.to_string())?.file_type().is_symlink() {
            return Err("selected Router CA contains a symlink".into());
        }
    }
    let file = std::fs::File::open(path).map_err(|error| error.to_string())?;
    let metadata = file.metadata().map_err(|error| error.to_string())?;
    if !metadata.is_file() || metadata.len() > 1_048_576 {
        return Err("selected Router CA must be a regular file within 1 MiB".into());
    }
    let mut pem = Vec::new();
    file.take(1_048_577).read_to_end(&mut pem).map_err(|error| error.to_string())?;
    if pem.len() > 1_048_576 { return Err("selected Router CA grew beyond its bound".into()); }
    let certificates = reqwest::Certificate::from_pem_bundle(&pem).map_err(|_| "selected Router CA has invalid certificates")?;
    if certificates.is_empty() || certificates.len() > 256 { return Err("selected Router CA requires a bounded certificate bundle".into()); }
    Ok(certificates)
}

pub(super) fn client(path: Option<&Path>) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .connect_timeout(super::CONNECT_TIMEOUT)
        .redirect(reqwest::redirect::Policy::none())
        .http1_only();
    if let Some(path) = path {
        for certificate in certificates(path)? { builder = builder.add_root_certificate(certificate); }
    }
    builder.build().map_err(|error| format!("could not build the verified bridge client: {error}"))
}

pub(super) async fn connect_websocket(
    client: reqwest::Client,
    url: &str,
    request: tungstenite::handshake::client::Request,
    config: tungstenite::protocol::WebSocketConfig,
) -> Result<tokio_tungstenite::WebSocketStream<reqwest::Upgraded>, String> {
    let key = request.headers().get("sec-websocket-key").ok_or("missing WebSocket key")?.as_bytes().to_vec();
    let offered = request.headers().get("sec-websocket-protocol").and_then(|value| value.to_str().ok()).unwrap_or("").to_string();
    let response = client.get(url).headers(request.headers().clone()).send().await.map_err(|error| error.to_string())?;
    if response.status() != reqwest::StatusCode::SWITCHING_PROTOCOLS { return Err("upstream refused WebSocket upgrade".into()); }
    let headers = response.headers();
    for name in ["upgrade", "sec-websocket-accept", "sec-websocket-protocol"] {
        if headers.get_all(name).iter().count() > 1 { return Err("ambiguous upstream WebSocket handshake".into()); }
    }
    let expected_accept = tungstenite::handshake::derive_accept_key(&key);
    if !headers.get("upgrade").and_then(|value| value.to_str().ok()).is_some_and(|value| value.eq_ignore_ascii_case("websocket"))
        || !headers.get("connection").and_then(|value| value.to_str().ok()).is_some_and(|value| value.split(',').any(|word| word.trim().eq_ignore_ascii_case("upgrade")))
        || headers.get("sec-websocket-accept").map(|value| value.as_bytes()) != Some(expected_accept.as_bytes())
    { return Err("invalid upstream WebSocket handshake".into()); }
    if let Some(selected) = headers.get("sec-websocket-protocol") {
        let selected = selected.to_str().map_err(|_| "invalid upstream WebSocket protocol")?;
        if !offered.split(',').any(|word| word.trim() == selected) { return Err("unoffered upstream WebSocket protocol".into()); }
    }
    if headers.contains_key("sec-websocket-extensions") { return Err("unoffered upstream WebSocket extensions".into()); }
    let stream = response.upgrade().await.map_err(|error| error.to_string())?;
    Ok(tokio_tungstenite::WebSocketStream::from_raw_socket(stream, tungstenite::protocol::Role::Client, Some(config)).await)
}


#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tungstenite::client::IntoClientRequest;

    #[test]
    fn selected_trust_is_bounded_fresh_and_https_only() {
        let directory = tempfile::tempdir().unwrap();
        let home = directory.path().canonicalize().unwrap();
        let path = home.join("ca.pem");
        let generated = rcgen::generate_simple_self_signed(vec!["localhost".into()]).unwrap();
        let pem = generated.cert.pem();
        std::fs::write(&path, &pem).unwrap();
        assert_eq!(selected_path("https://localhost", Some(&path)).unwrap(), Some(path.clone()));
        assert!(client(Some(&path)).is_ok());
        assert!(selected_path("http://localhost", Some(&path)).is_err());
        for bytes in [b"invalid".to_vec(), vec![b'x'; 1_048_577], pem.repeat(257).into_bytes()] {
            std::fs::write(&path, bytes).unwrap();
            assert!(client(Some(&path)).is_err());
        }
        std::fs::write(&path, &pem).unwrap();
        assert!(client(Some(&path)).is_ok());
        assert!(client(Some(&home)).is_err());
        std::fs::remove_file(&path).unwrap();
        assert!(client(Some(&path)).is_err());
        assert_eq!(selected_path("http://localhost", None).unwrap(), None);
    }

    #[cfg(unix)]
    #[test]
    fn selected_trust_rejects_file_and_ancestor_symlinks() {
        let directory = tempfile::tempdir().unwrap();
        let home = directory.path().canonicalize().unwrap();
        let pem = rcgen::generate_simple_self_signed(vec!["localhost".into()]).unwrap().cert.pem();
        std::fs::write(home.join("ca.pem"), pem).unwrap();
        std::os::unix::fs::symlink(home.join("ca.pem"), home.join("alias.pem")).unwrap();
        std::os::unix::fs::symlink(&home, home.join("linked")).unwrap();
        assert!(client(Some(&home.join("alias.pem"))).is_err());
        assert!(client(Some(&home.join("linked/ca.pem"))).is_err());
    }

    async fn handshake(response: String) -> bool {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/socket", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            while request.len() < 16_384 && !request.ends_with(b"\r\n\r\n") {
                let mut byte = [0];
                if stream.read(&mut byte).await.unwrap() == 0 { break; }
                request.push(byte[0]);
            }
            stream.write_all(response.as_bytes()).await.unwrap();
        });
        let mut request = url.replace("http://", "ws://").into_client_request().unwrap();
        request.headers_mut().insert("sec-websocket-key", "dGhlIHNhbXBsZSBub25jZQ==".parse().unwrap());
        request.headers_mut().insert("sec-websocket-protocol", "router.v1".parse().unwrap());
        let result = tokio::time::timeout(std::time::Duration::from_secs(2), connect_websocket(
            client(None).unwrap(), &url, request, tungstenite::protocol::WebSocketConfig::default(),
        )).await.unwrap().is_ok();
        server.await.unwrap();
        result
    }

    #[tokio::test]
    async fn upgraded_transport_checks_accept_protocol_extensions_and_redirects() {
        let valid = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\r\n";
        assert!(handshake(format!("{valid}Sec-WebSocket-Protocol: router.v1\r\n\r\n")).await);
        for invalid in [
            valid.replace("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=", "wrong"),
            valid.replace("Upgrade: websocket", "Upgrade: h2c"),
            format!("{valid}Sec-WebSocket-Protocol: unoffered\r\n"),
            format!("{valid}Sec-WebSocket-Protocol: router.v1\r\nSec-WebSocket-Protocol: router.v1\r\n"),
            format!("{valid}Sec-WebSocket-Extensions: permessage-deflate\r\n"),
            "HTTP/1.1 302 Found\r\nLocation: http://127.0.0.1:1/\r\nContent-Length: 0\r\n".into(),
        ] { assert!(!handshake(format!("{invalid}\r\n")).await); }
    }
}
