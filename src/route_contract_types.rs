use http::Method;

pub use crate::api_error::ApiDialect;

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum RouteClass {
    Neutral,
    Management,
    Service(ServiceKind),
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum ServiceKind {
    Anthropic,
    OpenAi,
    Codex,
    Qwen,
    Gemini,
    Vertex,
    Bedrock,
    GitHub,
    Git,
    ActivityPub,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum ListenerKind {
    Combined,
    InferenceOnly,
    Admin,
    GitHubAdapter,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum RouteAuth {
    None,
    Client,
    Admin,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum RouteMethod {
    Get,
    Post,
    Patch,
    Delete,
    Any,
}

impl RouteMethod {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Get => "GET",
            Self::Post => "POST",
            Self::Patch => "PATCH",
            Self::Delete => "DELETE",
            Self::Any => "ANY",
        }
    }

    pub(super) fn matches(self, method: &Method) -> bool {
        self == Self::Any
            || matches!(
                (self, method),
                (Self::Get, &Method::GET)
                    | (Self::Post, &Method::POST)
                    | (Self::Patch, &Method::PATCH)
                    | (Self::Delete, &Method::DELETE)
            )
    }
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum RouteId {
    Health,
    AggregateModels,
    SubscriptionUsage,
    SubscriptionUsageProvider,
    Tokens,
    ClientTokens,
    RevokeToken,
    RotateToken,
    RotateClientToken,
    Providers,
    Provider,
    Login,
    LoginSession,
    LoginCode,
    Usage,
    Accounts,
    CredentialStatus,
    SubscriptionHealth,
    Metrics,
    AdminStatus,
    AdminBootstrap,
    AdminBootstrapConfirm,
    AdminRotate,
    AdminSummary,
    AnthropicMessages,
    AnthropicCountTokens,
    AnthropicModels,
    AnthropicModel,
    OpenAiChatCompletions,
    OpenAiChatCompletion,
    OpenAiChatCompletionMessages,
    OpenAiResponses,
    OpenAiResponse,
    OpenAiResponseCancel,
    OpenAiResponseInputItems,
    OpenAiConversations,
    OpenAiConversation,
    OpenAiConversationItems,
    OpenAiConversationItem,
    OpenAiModels,
    OpenAiModel,
    CodexChatCompletions,
    CodexChatCompletion,
    CodexChatCompletionMessages,
    CodexResponses,
    CodexResponse,
    CodexResponseCancel,
    CodexResponseInputItems,
    CodexConversations,
    CodexConversation,
    CodexConversationItems,
    CodexConversationItem,
    CodexModels,
    CodexModel,
    QwenChatCompletions,
    QwenChatCompletion,
    QwenChatCompletionMessages,
    QwenResponses,
    QwenResponse,
    QwenResponseCancel,
    QwenResponseInputItems,
    QwenConversations,
    QwenConversation,
    QwenConversationItems,
    QwenConversationItem,
    QwenModels,
    QwenModel,
    GeminiModels,
    GeminiModel,
    Vertex,
    AnthropicVertex,
    BedrockInvoke,
    BedrockInvokeStream,
    GitHubRest,
    GitHubGraphql,
    Git,
    GitHubAdapterRest,
    GitHubAdapterGraphql,
    GitHubAdapterGit,
    ActivityPubActor,
    ActivityPubInbox,
    ActivityPubOutbox,
    ActivityPubFollowers,
    ActivityPubFollowProblemsets,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RouteSpec {
    pub id: RouteId,
    pub method: RouteMethod,
    pub template: &'static str,
    pub class: RouteClass,
    pub auth: RouteAuth,
    pub dialect: ApiDialect,
    pub listeners: &'static [ListenerKind],
}
