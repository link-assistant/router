use serde::{Deserialize, Serialize};

use crate::subscription::SubscriptionProvider;

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize, clap::ValueEnum)]
pub enum UsageProvider {
    #[value(name = "anthropic")]
    #[serde(rename = "anthropic")]
    Anthropic,
    #[value(name = "openai")]
    #[serde(rename = "openai")]
    OpenAi,
    #[value(name = "z-ai")]
    #[serde(rename = "z-ai")]
    ZAi,
    #[value(name = "lefine")]
    #[serde(rename = "lefine")]
    Lefine,
    #[value(name = "gemini")]
    #[serde(rename = "gemini")]
    Gemini,
    #[value(name = "qwen")]
    #[serde(rename = "qwen")]
    Qwen,
}

impl UsageProvider {
    pub const ALL: [Self; 6] = [
        Self::Anthropic,
        Self::OpenAi,
        Self::ZAi,
        Self::Lefine,
        Self::Gemini,
        Self::Qwen,
    ];

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Anthropic => "anthropic",
            Self::OpenAi => "openai",
            Self::ZAi => "z-ai",
            Self::Lefine => "lefine",
            Self::Gemini => "gemini",
            Self::Qwen => "qwen",
        }
    }

    pub(super) const fn subscription(self) -> Option<SubscriptionProvider> {
        match self {
            Self::Anthropic => Some(SubscriptionProvider::Claude),
            Self::OpenAi => Some(SubscriptionProvider::Codex),
            Self::Gemini => Some(SubscriptionProvider::Gemini),
            Self::Qwen => Some(SubscriptionProvider::Qwen),
            Self::ZAi | Self::Lefine => None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct UsageEnvelope {
    pub schema_version: u8,
    pub subscriptions: Vec<SubscriptionUsage>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SubscriptionUsage {
    pub provider: UsageProvider,
    pub state: UsageState,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<String>,
    pub windows: Vec<UsageWindow>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub additional_limits: Vec<NamedLimit>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credits: Option<Credits>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_created: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_after_seconds: Option<u64>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UsageState {
    Available,
    Unavailable,
    Unverified,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct UsageWindow {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub used_percentage: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining_percentage: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resets_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_seconds: Option<u64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct NamedLimit {
    pub name: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub windows: Vec<UsageWindow>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub used: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Credits {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub balance: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unlimited: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overage_limit_reached: Option<bool>,
}
