//! Bounded file and HTTP reads using a dedicated guarded transport.
use super::{MAX_DOCUMENT_BYTES, ModelCatalogDocument, parse_document};
use crate::upstream_guard::{GuardedResolver, NetworkPolicy};
use tokio::io::AsyncReadExt;

pub(super) async fn load(source: &str) -> Result<ModelCatalogDocument, String> {
    load_with_policy(source, NetworkPolicy::from_env()).await
}

pub(super) async fn load_with_policy(
    source: &str,
    policy: NetworkPolicy,
) -> Result<ModelCatalogDocument, String> {
    let mut bytes = Vec::new();
    if source.starts_with("http://") || source.starts_with("https://") {
        let url = url::Url::parse(source).map_err(|_| "invalid catalog URL")?;
        if !url.username().is_empty() || url.password().is_some() {
            return Err("catalog URLs must not contain credentials".into());
        }
        policy
            .check_base_url(source)
            .map_err(|error| error.to_string())?;
        // Never fall back to an unguarded client. Disable environment proxies,
        // which could resolve a public URL to a private address outside this guard.
        let client = crate::upstream_client::upstream_client_builder()
            .no_proxy()
            .dns_resolver(std::sync::Arc::new(GuardedResolver::new(policy)))
            .build()
            .map_err(|_| "could not construct guarded catalog client")?;
        let mut response = client
            .get(url)
            .send()
            .await
            .map_err(|_| "catalog HTTP request failed")?;
        if !response.status().is_success() {
            return Err(format!("catalog returned HTTP {}", response.status()));
        }
        if response
            .content_length()
            .is_some_and(|size| size > MAX_DOCUMENT_BYTES as u64)
        {
            return Err("model catalog exceeds the 1 MiB size limit".into());
        }
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| "catalog body read failed")?
        {
            if chunk.len() > MAX_DOCUMENT_BYTES.saturating_sub(bytes.len()) {
                return Err("model catalog exceeds the 1 MiB size limit".into());
            }
            bytes.extend_from_slice(&chunk);
        }
    } else {
        let path = if source.starts_with("file:") {
            url::Url::parse(source)
                .map_err(|_| "invalid file URL")?
                .to_file_path()
                .map_err(|()| "file URL must name a local path")?
        } else if source.contains("://") {
            return Err("catalog URLs must use http, https or file".into());
        } else {
            std::path::PathBuf::from(source)
        };
        if !tokio::fs::metadata(&path)
            .await
            .map_err(|_| "catalog file metadata unavailable")?
            .is_file()
        {
            return Err("catalog source must be a regular file".into());
        }
        let file = tokio::fs::File::open(&path)
            .await
            .map_err(|_| "catalog file could not be opened")?;
        file.take((MAX_DOCUMENT_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .await
            .map_err(|_| "catalog file could not be read")?;
    }
    parse_document(&bytes)
}
