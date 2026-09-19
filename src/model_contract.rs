//! Model-selection and served-identity contracts shared by every protocol.
//!
//! A wrapper-selected model is an authorization boundary, not an argv hint.
//! The durable policy below is deliberately exact and case-sensitive: model
//! aliases are accepted only when the provider advertised that exact alias.

use serde::{Deserialize, Serialize};

/// Kind of selector a caller supplied. Dynamic aliases are factual only when
/// the authenticated provider catalog advertised that exact spelling.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelSelectorKind {
    Concrete,
    ProviderDynamicAlias,
    OperatorAlias,
    #[default]
    Unknown,
}

impl ModelSelectorKind {
    /// Interpret only explicit catalog metadata; selector spelling is never
    /// evidence that an id is an alias.
    #[must_use]
    pub fn from_catalog_value(value: Option<&serde_json::Value>) -> Self {
        match value.and_then(serde_json::Value::as_str) {
            Some("provider_dynamic_alias" | "provider_advertised_alias") => {
                Self::ProviderDynamicAlias
            }
            Some("operator_alias") => Self::OperatorAlias,
            Some("concrete" | "provider_advertised_exact_id") => Self::Concrete,
            _ => Self::Unknown,
        }
    }

    /// Whether this selector explicitly delegates concrete resolution.
    #[must_use]
    pub const fn permits_resolution(self) -> bool {
        matches!(self, Self::ProviderDynamicAlias | Self::OperatorAlias)
    }
}

/// Exact routing scope for one model observation or exchange.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct ModelRouteScope {
    pub provider: Option<String>,
    pub account: Option<String>,
    pub endpoint: Option<String>,
    pub protocols: Vec<String>,
}

/// Canonical truth descriptor used by model diagnostics and boundary logs.
///
/// `None` is intentionally serialized as JSON `null`: it means unknown, not
/// that Router may fill the field from a nearby selector.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct ModelTruthDescriptor {
    pub requested_selector: Option<String>,
    pub selector_kind: ModelSelectorKind,
    pub route: ModelRouteScope,
    pub upstream_request_model: Option<String>,
    pub upstream_served_model: Option<String>,
    pub capabilities: serde_json::Value,
    pub capability_provenance: serde_json::Value,
    pub allow_substitution: bool,
    pub substitution_source: Option<String>,
}

// Serde's `skip_serializing_if` callback must accept a reference.
#[allow(clippy::trivially_copy_pass_by_ref)]
const fn is_false(value: &bool) -> bool {
    !*value
}

/// Model authority attached to one router-issued credential.
///
/// An empty allow-list preserves the historical unpinned behavior. A
/// non-empty list contains every exact selector the holder may request;
/// multiple entries therefore represent an explicit switching grant.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct ModelAccessPolicy {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub allowed_models: Vec<String>,
    /// Permit a provider to serve a different concrete model than requested.
    /// This never widens `allowed_models` at request time.
    #[serde(default, skip_serializing_if = "is_false")]
    pub allow_substitution: bool,
    /// User-controlled setting that enabled substitution, when enabled.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub substitution_source: Option<String>,
}

impl ModelAccessPolicy {
    /// Create a policy for one exact selector.
    #[must_use]
    pub fn exact(model: impl Into<String>) -> Self {
        Self {
            allowed_models: vec![model.into()],
            allow_substitution: false,
            substitution_source: None,
        }
    }

    /// Whether this credential permits the exact request selector.
    #[must_use]
    pub fn permits(&self, requested: &str) -> bool {
        self.allowed_models.is_empty()
            || self
                .allowed_models
                .iter()
                .any(|allowed| allowed == requested)
    }

    /// Validate values before persisting a grant.
    pub fn validate(&self) -> Result<(), String> {
        if self
            .allowed_models
            .iter()
            .any(|model| model.trim().is_empty())
        {
            return Err("allowed model ids must not be empty".to_string());
        }
        let mut unique = self.allowed_models.clone();
        unique.sort();
        unique.dedup();
        if unique.len() != self.allowed_models.len() {
            return Err("allowed model ids must not contain duplicates".to_string());
        }
        if self.allow_substitution
            && self
                .substitution_source
                .as_deref()
                .is_none_or(|source| source.trim().is_empty())
        {
            return Err(
                "enabled model substitution must name its configuration source".to_string(),
            );
        }
        if !self.allow_substitution && self.substitution_source.is_some() {
            return Err(
                "a substitution source requires model substitution to be enabled".to_string(),
            );
        }
        Ok(())
    }
}

/// Stable machine-readable refusal for a request outside a token grant.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ModelAccessError {
    pub code: String,
    pub requested_model: String,
    pub allowed_models: Vec<String>,
}

impl ModelAccessError {
    #[must_use]
    pub fn new(requested: &str, policy: &ModelAccessPolicy) -> Self {
        Self {
            code: "model_not_allowed".to_string(),
            requested_model: requested.to_string(),
            allowed_models: policy.allowed_models.clone(),
        }
    }

    #[must_use]
    pub fn policy_unavailable(requested: &str) -> Self {
        Self {
            code: "model_policy_unavailable".to_string(),
            requested_model: requested.to_string(),
            allowed_models: Vec::new(),
        }
    }
}

impl std::fmt::Display for ModelAccessError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.code == "model_policy_unavailable" {
            return write!(
                formatter,
                "model_policy_unavailable: could not verify the exact model grant for `{}`",
                self.requested_model
            );
        }
        write!(
            formatter,
            "model_not_allowed: requested model `{}` is outside this credential's exact allow-list [{}]",
            self.requested_model,
            self.allowed_models.join(", ")
        )
    }
}

impl std::error::Error for ModelAccessError {}

/// Stable refusal when an upstream response does not prove what served it.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ServedModelError {
    pub code: String,
    pub requested_model: String,
    pub served_model: Option<String>,
}

impl std::fmt::Display for ServedModelError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.served_model.as_deref() {
            Some(served) => write!(
                formatter,
                "{}: requested `{}` but upstream served `{served}`",
                self.code, self.requested_model
            ),
            None => write!(
                formatter,
                "served_model_unknown: upstream omitted the model that served request `{}`",
                self.requested_model
            ),
        }
    }
}

impl std::error::Error for ServedModelError {}

/// Require an upstream to identify the served model and enforce strict
/// equality unless substitution was explicitly enabled for the credential.
pub fn validate_served_model(
    requested: &str,
    served: Option<&str>,
    allow_substitution: bool,
) -> Result<String, ServedModelError> {
    validate_served_model_for_selector(
        requested,
        served,
        allow_substitution,
        ModelSelectorKind::Concrete,
    )
}

/// Validate served identity with exact, evidence-backed selector semantics.
///
/// A provider or operator alias is itself the caller's explicit request for a
/// resolution policy. It may therefore resolve to another concrete id without
/// turning on the broader fallback/substitution setting. Unknown selectors are
/// deliberately treated as concrete and fail closed.
pub fn validate_served_model_for_selector(
    requested: &str,
    served: Option<&str>,
    allow_substitution: bool,
    selector_kind: ModelSelectorKind,
) -> Result<String, ServedModelError> {
    let served = served
        .filter(|model| !model.is_empty())
        .ok_or_else(|| ServedModelError {
            code: "served_model_unknown".to_string(),
            requested_model: requested.to_string(),
            served_model: None,
        })?;
    // With no requested selector there is nothing to substitute, but the
    // upstream still has to identify the concrete model that served.  This is
    // how an intentionally unpinned credential remains truthful without
    // turning an omitted selector into a Router-chosen default.
    if !requested.is_empty()
        && served != requested
        && !allow_substitution
        && !selector_kind.permits_resolution()
    {
        return Err(ServedModelError {
            code: "model_substitution_not_allowed".to_string(),
            requested_model: requested.to_string(),
            served_model: Some(served.to_string()),
        });
    }
    Ok(served.to_string())
}

/// Read a concrete model identity from a translated upstream object.
///
/// The supported locations are upstream protocol fields, not Router-private
/// metadata. Callers validate this before reshaping the object so a translator
/// never has to invent an identity merely to satisfy its output schema.
#[must_use]
pub fn served_model_from(payload: &serde_json::Value) -> Option<&str> {
    [
        "/model",
        "/modelVersion",
        "/response/model",
        "/response/modelVersion",
        "/message/model",
    ]
    .into_iter()
    .find_map(|pointer| {
        payload
            .pointer(pointer)
            .and_then(serde_json::Value::as_str)
            .filter(|model| !model.is_empty())
    })
}

/// Validate identity for every translated response.
///
/// Unpinned credentials may omit a request selector, but the translated
/// upstream must still prove the concrete model that served. A differing
/// non-empty selector is accepted only when substitution was explicitly
/// enabled on the credential.
pub fn validate_translated_response(
    requested: &str,
    payload: &serde_json::Value,
    policy: &ModelAccessPolicy,
) -> Result<Option<String>, ServedModelError> {
    validate_served_model(
        requested,
        served_model_from(payload),
        policy.allow_substitution,
    )
    .map(Some)
}

/// Validate a translated response with catalog-proven selector semantics.
pub fn validate_translated_response_for_selector(
    requested: &str,
    payload: &serde_json::Value,
    policy: &ModelAccessPolicy,
    selector_kind: ModelSelectorKind,
) -> Result<Option<String>, ServedModelError> {
    validate_served_model_for_selector(
        requested,
        served_model_from(payload),
        policy.allow_substitution,
        selector_kind,
    )
    .map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_policy_is_case_sensitive_and_fail_closed() {
        let policy = ModelAccessPolicy::exact("provider/model-v1");
        assert!(policy.permits("provider/model-v1"));
        assert!(!policy.permits("provider/Model-v1"));
        assert!(!policy.permits("model-v1"));
    }

    #[test]
    fn substitution_requires_a_durable_configuration_source() {
        let mut policy = ModelAccessPolicy::exact("provider/model-v1");
        policy.allow_substitution = true;
        assert_eq!(
            policy.validate().unwrap_err(),
            "enabled model substitution must name its configuration source"
        );

        policy.substitution_source = Some("router with --allow-model-substitution".into());
        assert!(policy.validate().is_ok());

        policy.allow_substitution = false;
        assert_eq!(
            policy.validate().unwrap_err(),
            "a substitution source requires model substitution to be enabled"
        );
    }

    #[test]
    fn served_identity_requires_explicit_substitution() {
        let denied = validate_served_model("requested", Some("actual"), false).unwrap_err();
        assert_eq!(denied.code, "model_substitution_not_allowed");
        assert_eq!(
            validate_served_model("requested", Some("actual"), true).unwrap(),
            "actual"
        );
        assert_eq!(
            validate_served_model("requested", None, true)
                .unwrap_err()
                .code,
            "served_model_unknown"
        );
    }

    #[test]
    fn empty_outer_identity_does_not_hide_a_concrete_protocol_identity() {
        let payload = serde_json::json!({
            "model": null,
            "response": {"model": "served-exact"}
        });
        assert_eq!(served_model_from(&payload), Some("served-exact"));
    }

    #[test]
    fn only_explicit_alias_metadata_permits_provider_resolution() {
        assert_eq!(
            validate_served_model_for_selector(
                "auto-review",
                Some("model-b"),
                false,
                ModelSelectorKind::ProviderDynamicAlias,
            )
            .unwrap(),
            "model-b"
        );
        for kind in [ModelSelectorKind::Concrete, ModelSelectorKind::Unknown] {
            assert_eq!(
                validate_served_model_for_selector("auto-review", Some("model-b"), false, kind)
                    .unwrap_err()
                    .code,
                "model_substitution_not_allowed"
            );
        }
        assert_eq!(
            ModelSelectorKind::from_catalog_value(Some(&serde_json::json!(
                "provider_dynamic_alias"
            ))),
            ModelSelectorKind::ProviderDynamicAlias
        );
        assert_eq!(
            ModelSelectorKind::from_catalog_value(Some(&serde_json::json!("looks-auto"))),
            ModelSelectorKind::Unknown
        );
    }

    #[test]
    fn pinned_translated_response_must_prove_identity() {
        let policy = ModelAccessPolicy::exact("model-a");
        let mismatch = validate_translated_response(
            "model-a",
            &serde_json::json!({"model": "model-b"}),
            &policy,
        )
        .unwrap_err();
        assert_eq!(mismatch.code, "model_substitution_not_allowed");
        assert_eq!(
            validate_translated_response("model-a", &serde_json::json!({}), &policy)
                .unwrap_err()
                .code,
            "served_model_unknown"
        );
    }

    #[test]
    fn unpinned_translated_response_still_requires_concrete_identity() {
        let policy = ModelAccessPolicy::default();
        assert_eq!(
            validate_translated_response("", &serde_json::json!({}), &policy)
                .unwrap_err()
                .code,
            "served_model_unknown"
        );
        assert_eq!(
            validate_translated_response(
                "",
                &serde_json::json!({"modelVersion": "provider/model"}),
                &policy,
            )
            .unwrap(),
            Some("provider/model".to_string())
        );
    }
}
