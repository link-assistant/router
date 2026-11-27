use std::sync::Arc;
use std::time::Instant;

use axum::http::HeaderMap;
use serde_json::{Value, json};

use super::{LogIdentity, RequestLog, redacted_body, redacted_headers, token_log_key};
use crate::runtime_config::RuntimeConfig;

impl RequestLog {
    /// Attach the shared configuration selected when the server started.
    pub(crate) fn install_runtime_config(&self, config: Arc<RuntimeConfig>) {
        assert!(
            self.runtime_config.set(config).is_ok(),
            "runtime configuration already installed"
        );
    }

    pub(crate) fn runtime_config(&self) -> Option<&Arc<RuntimeConfig>> {
        self.runtime_config.get()
    }

    pub(crate) fn runtime_identity(&self, correlation: &str) -> (Option<String>, Option<String>) {
        let identity = self.identity(correlation);
        (identity.id, identity.label)
    }

    pub(crate) fn record_payload_rules(
        &self,
        correlation: &str,
        headers: &HeaderMap,
        claims: &crate::token::TokenClaims,
        phase: &str,
        fields: Value,
    ) {
        let identity = crate::proxy::extract_client_token(headers).map_or_else(
            LogIdentity::unauthenticated,
            |token| LogIdentity {
                hash: token_log_key(token),
                id: Some(claims.sub.clone()),
                label: Some(claims.label.clone()),
            },
        );
        self.record_for(correlation, phase, fields, &identity);
    }

    /// Send a prepared upstream request while recording the exact request and
    /// the response metadata under the client request's correlation id.
    pub async fn send_upstream(
        &self,
        correlation_id: &str,
        client: &reqwest::Client,
        builder: reqwest::RequestBuilder,
    ) -> Result<reqwest::Response, crate::upstream_client::UpstreamSendError> {
        if let Some(account) = crate::account_policy_scope::account() {
            self.set_account(correlation_id, &account);
        }
        let request = builder.build()?;
        if crate::account_policy_scope::active() {
            // Keep the policy loop's state out of every protocol handler's future.
            return Box::pin(crate::account_policy_dispatch::send(
                self,
                correlation_id,
                client,
                request,
            ))
            .await;
        }
        self.send_prepared(correlation_id, client, request).await
    }

    /// Send and log one prepared attempt without nesting the policy retry loop.
    pub(crate) async fn send_prepared(
        &self,
        correlation_id: &str,
        client: &reqwest::Client,
        mut request: reqwest::Request,
    ) -> Result<reqwest::Response, crate::upstream_client::UpstreamSendError> {
        if let Err(error) =
            crate::runtime_config::egress::http(self, correlation_id, &mut request).await
        {
            self.record(
                correlation_id,
                "payload_rules_rejected",
                json!({"error": error.to_string()}),
            );
            return Err(error);
        }
        self.begin_upstream(correlation_id);
        self.record(
            correlation_id,
            "upstream_request",
            json!({
                "method": request.method().as_str(),
                "uri": request.url().as_str(),
                "headers": redacted_headers(request.headers()),
                "body": request.body().and_then(reqwest::Body::as_bytes).map(redacted_body),
            }),
        );
        let started = Instant::now();
        let result = crate::upstream_client::execute_with_first_byte_timeout(
            client,
            request,
            crate::upstream_client::upstream_first_byte_timeout(),
        )
        .await;
        match &result {
            Ok(response) => self.record(
                correlation_id,
                "upstream_response",
                json!({
                    "status": response.status().as_u16(),
                    "headers": redacted_headers(response.headers()),
                    "latency_ms": started.elapsed().as_millis(),
                }),
            ),
            Err(error) => self.record(
                correlation_id,
                "upstream_error",
                json!({
                    "error": error.to_string(),
                    "latency_ms": started.elapsed().as_millis(),
                }),
            ),
        }
        result.map(|response| match &self.error_log {
            Some(log) => log.wrap(correlation_id, response),
            None => response,
        })
    }
}
