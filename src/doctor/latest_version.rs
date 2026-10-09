//! Read-only release diagnostics. Never installs or updates the running server.
use futures_util::StreamExt as _;
use serde_json::{Value, json};

const RELEASE_API: &str = "https://api.github.com/repos/link-assistant/router/releases/latest";

/// Check the latest stable GitHub release without sending Router credentials.
pub async fn latest_version(client: &reqwest::Client) -> Result<Value, String> {
    fetch(client, RELEASE_API).await
}

async fn fetch(client: &reqwest::Client, endpoint: &str) -> Result<Value, String> {
    let response = client
        .get(endpoint)
        .header(
            "user-agent",
            format!("link-assistant-router/{}", crate::VERSION),
        )
        .header("accept", "application/vnd.github+json")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .and_then(reqwest::Response::error_for_status)
        .map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    let mut body = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        if body.len().saturating_add(chunk.len()) > 64 * 1024 {
            return Err("release response exceeds limit".into());
        }
        body.extend_from_slice(&chunk);
    }
    let release: Value = serde_json::from_slice(&body).map_err(|e| e.to_string())?;
    let tag = release["tag_name"].as_str().ok_or("release tag missing")?;
    let latest = tag.strip_prefix('v').unwrap_or(tag);
    let latest_parts = parts(latest).ok_or("invalid stable release version")?;
    let current_parts = parts(crate::VERSION).ok_or("invalid current version")?;
    Ok(
        json!({"current_version": crate::VERSION, "latest_version": latest,
        "update_available": latest_parts > current_parts,
        "release_url": format!("https://github.com/link-assistant/router/releases/tag/{tag}")}),
    )
}

fn parts(version: &str) -> Option<[u64; 3]> {
    let parts = version
        .split('.')
        .map(str::parse)
        .collect::<Result<Vec<u64>, _>>()
        .ok()?;
    parts.try_into().ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn version_check_uses_http_status_and_validates_the_release_tag() {
        for (status, body, expected) in [
            (200, r#"{"tag_name":"v999.0.0"}"#, true),
            (200, r#"{"tag_name":"v0.1.0"}"#, true),
            (200, r#"{"tag_name":"invalid"}"#, false),
            (502, "failed", false),
        ] {
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let url = format!("http://{}", listener.local_addr().unwrap());
            let app = axum::Router::new().route(
                "/",
                axum::routing::get(move || async move {
                    (axum::http::StatusCode::from_u16(status).unwrap(), body)
                }),
            );
            let server = tokio::spawn(async move {
                axum::serve(listener, app).await.unwrap();
            });
            let result = fetch(&reqwest::Client::new(), &url).await;
            assert_eq!(result.is_ok(), expected, "{result:?}");
            if let Ok(result) = result {
                assert_eq!(result["update_available"], body.contains("999"));
            }
            server.abort();
            let _ = server.await;
        }
    }
}
