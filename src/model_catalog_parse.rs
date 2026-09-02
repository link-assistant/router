use std::collections::BTreeSet;

use serde_json::Value;

use crate::subscription::SubscriptionProvider;

use crate::model_catalog::CatalogRecord;

#[cfg(test)]
pub(super) fn parse_catalog(
    provider: SubscriptionProvider,
    body: &Value,
) -> Result<Vec<String>, String> {
    parse_catalog_records(
        provider,
        body,
        "primary",
        chrono::Utc::now().timestamp(),
        "test",
        0,
    )
    .map(|records| {
        records
            .into_iter()
            .map(|record| record.canonical_id)
            .collect()
    })
}

pub(super) fn parse_catalog_records(
    provider: SubscriptionProvider,
    body: &Value,
    account: &str,
    fetched_at: i64,
    generation: &str,
    offset: usize,
) -> Result<Vec<CatalogRecord>, String> {
    let (array_key, id_key) = match provider {
        SubscriptionProvider::Claude | SubscriptionProvider::Qwen => ("data", "id"),
        SubscriptionProvider::Codex => ("models", "slug"),
        SubscriptionProvider::Gemini => ("models", "name"),
    };
    let models = body
        .get(array_key)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("response has no {array_key} array"))?
        .iter()
        .filter(|entry| {
            provider != SubscriptionProvider::Gemini
                || entry
                    .get("supportedGenerationMethods")
                    .and_then(Value::as_array)
                    .is_none_or(|methods| methods.iter().any(|method| method == "generateContent"))
        })
        .filter_map(Value::as_object)
        .filter_map(|raw| {
            let id = raw.get(id_key).and_then(Value::as_str)?;
            let canonical_id = id.strip_prefix("models/").unwrap_or(id).to_string();
            (!canonical_id.is_empty()).then_some((raw, canonical_id))
        })
        .enumerate()
        .map(|(index, (raw, canonical_id))| CatalogRecord {
            provider,
            account: account.to_string(),
            canonical_id,
            raw: raw.clone(),
            source_order: (offset + index) as u64,
            fetched_at,
            health_generation: generation.to_string(),
            protocols: provider_protocols(provider),
        })
        .collect::<Vec<_>>();
    if models.is_empty() {
        Err("response contained no model identifiers".to_string())
    } else {
        Ok(models)
    }
}

pub(super) fn provider_protocols(
    provider: SubscriptionProvider,
) -> BTreeSet<crate::client_policy::ClientProtocol> {
    use crate::client_policy::ClientProtocol;
    let native = match provider {
        SubscriptionProvider::Claude => ClientProtocol::AnthropicMessages,
        SubscriptionProvider::Codex => ClientProtocol::OpenAIResponses,
        SubscriptionProvider::Gemini => ClientProtocol::GeminiNative,
        SubscriptionProvider::Qwen => ClientProtocol::OpenAIChat,
    };
    [ClientProtocol::Catalog, native].into_iter().collect()
}

pub(super) fn next_catalog_cursor(
    provider: SubscriptionProvider,
    body: &Value,
    page: &[CatalogRecord],
) -> Result<Option<(String, String)>, String> {
    if let Some(token) = body
        .get("nextPageToken")
        .or_else(|| body.get("next_page_token"))
        .and_then(Value::as_str)
        .filter(|token| !token.is_empty())
    {
        let key = if provider == SubscriptionProvider::Gemini {
            "pageToken"
        } else {
            "page_token"
        };
        return Ok(Some((key.into(), token.into())));
    }
    if let Some(token) = body
        .get("next_cursor")
        .or_else(|| body.get("cursor"))
        .or_else(|| body.get("next"))
        .or_else(|| body.pointer("/pagination/next_cursor"))
        .and_then(Value::as_str)
        .filter(|token| !token.is_empty())
    {
        return Ok(Some(("cursor".into(), token.into())));
    }
    if !body
        .get("has_more")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        return Ok(None);
    }
    let token = body
        .get("last_id")
        .and_then(Value::as_str)
        .filter(|token| !token.is_empty())
        .or_else(|| page.last().map(|record| record.canonical_id.as_str()))
        .ok_or_else(|| format!("{provider} catalog says has_more without a cursor"))?;
    let key = if provider == SubscriptionProvider::Claude {
        "after_id"
    } else {
        "after"
    };
    Ok(Some((key.into(), token.into())))
}
