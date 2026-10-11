// Generated draft from src/route_contract_types.rs; sha256=9fa5ae69e2dc7aed3a5766a5c7ef79ca236a045840a6305afc92f9573b54629b
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_64d2df2203b3b0e74f73fa23ac3fa5796f20b765f29c99be41cec03c3aa9a464 = {"schemaVersion":1,"types":{"ServiceKind":{"kind":"data","name":"ServiceKind","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]},{"name":"Qwen","fields":[]},{"name":"Gemini","fields":[]},{"name":"Vertex","fields":[]},{"name":"Bedrock","fields":[]},{"name":"GitHub","fields":[]},{"name":"Git","fields":[]},{"name":"ActivityPub","fields":[]}]}}};

const ml_host_value_refinements_64d2df2203b3b0e74f73fa23ac3fa5796f20b765f29c99be41cec03c3aa9a464 = new Map([]);

function ml_make_RouteClass_Neutral() {
  return Object.freeze({ $: 'Neutral' });
}

function ml_make_RouteClass_Management() {
  return Object.freeze({ $: 'Management' });
}

function ml_make_RouteClass_Service(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"ServiceKind"}, ml_host_value_schema_64d2df2203b3b0e74f73fa23ac3fa5796f20b765f29c99be41cec03c3aa9a464, { refinements: ml_host_value_refinements_64d2df2203b3b0e74f73fa23ac3fa5796f20b765f29c99be41cec03c3aa9a464 });
  return Object.freeze({ $: 'Service', field0: field0 });
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function ml_make_ServiceKind_Anthropic() {
  return Object.freeze({ $: 'Anthropic' });
}

function ml_make_ServiceKind_OpenAi() {
  return Object.freeze({ $: 'OpenAi' });
}

function ml_make_ServiceKind_Codex() {
  return Object.freeze({ $: 'Codex' });
}

function ml_make_ServiceKind_Qwen() {
  return Object.freeze({ $: 'Qwen' });
}

function ml_make_ServiceKind_Gemini() {
  return Object.freeze({ $: 'Gemini' });
}

function ml_make_ServiceKind_Vertex() {
  return Object.freeze({ $: 'Vertex' });
}

function ml_make_ServiceKind_Bedrock() {
  return Object.freeze({ $: 'Bedrock' });
}

function ml_make_ServiceKind_GitHub() {
  return Object.freeze({ $: 'GitHub' });
}

function ml_make_ServiceKind_Git() {
  return Object.freeze({ $: 'Git' });
}

function ml_make_ServiceKind_ActivityPub() {
  return Object.freeze({ $: 'ActivityPub' });
}

function ml_make_ListenerKind_Combined() {
  return Object.freeze({ $: 'Combined' });
}

function ml_make_ListenerKind_InferenceOnly() {
  return Object.freeze({ $: 'InferenceOnly' });
}

function ml_make_ListenerKind_Admin() {
  return Object.freeze({ $: 'Admin' });
}

function ml_make_ListenerKind_GitHubAdapter() {
  return Object.freeze({ $: 'GitHubAdapter' });
}

function ml_make_RouteAuth_None() {
  return Object.freeze({ $: 'None' });
}

function ml_make_RouteAuth_Client() {
  return Object.freeze({ $: 'Client' });
}

function ml_make_RouteAuth_Admin() {
  return Object.freeze({ $: 'Admin' });
}

function ml_make_RouteMethod_Get() {
  return Object.freeze({ $: 'Get' });
}

function ml_make_RouteMethod_Post() {
  return Object.freeze({ $: 'Post' });
}

function ml_make_RouteMethod_Put() {
  return Object.freeze({ $: 'Put' });
}

function ml_make_RouteMethod_Patch() {
  return Object.freeze({ $: 'Patch' });
}

function ml_make_RouteMethod_Delete() {
  return Object.freeze({ $: 'Delete' });
}

function ml_make_RouteMethod_Any() {
  return Object.freeze({ $: 'Any' });
}

function ml_make_RouteId_Health() {
  return Object.freeze({ $: 'Health' });
}

function ml_make_RouteId_AggregateModels() {
  return Object.freeze({ $: 'AggregateModels' });
}

function ml_make_RouteId_SubscriptionUsage() {
  return Object.freeze({ $: 'SubscriptionUsage' });
}

function ml_make_RouteId_SubscriptionUsageProvider() {
  return Object.freeze({ $: 'SubscriptionUsageProvider' });
}

function ml_make_RouteId_Tokens() {
  return Object.freeze({ $: 'Tokens' });
}

function ml_make_RouteId_ClientTokens() {
  return Object.freeze({ $: 'ClientTokens' });
}

function ml_make_RouteId_RunLease() {
  return Object.freeze({ $: 'RunLease' });
}

function ml_make_RouteId_RevokeToken() {
  return Object.freeze({ $: 'RevokeToken' });
}

function ml_make_RouteId_RotateToken() {
  return Object.freeze({ $: 'RotateToken' });
}

function ml_make_RouteId_RotateClientToken() {
  return Object.freeze({ $: 'RotateClientToken' });
}

function ml_make_RouteId_Providers() {
  return Object.freeze({ $: 'Providers' });
}

function ml_make_RouteId_Provider() {
  return Object.freeze({ $: 'Provider' });
}

function ml_make_RouteId_Login() {
  return Object.freeze({ $: 'Login' });
}

function ml_make_RouteId_LoginSession() {
  return Object.freeze({ $: 'LoginSession' });
}

function ml_make_RouteId_LoginCode() {
  return Object.freeze({ $: 'LoginCode' });
}

function ml_make_RouteId_Usage() {
  return Object.freeze({ $: 'Usage' });
}

function ml_make_RouteId_Accounts() {
  return Object.freeze({ $: 'Accounts' });
}

function ml_make_RouteId_AccountPause() {
  return Object.freeze({ $: 'AccountPause' });
}

function ml_make_RouteId_AccountResume() {
  return Object.freeze({ $: 'AccountResume' });
}

function ml_make_RouteId_CredentialStatus() {
  return Object.freeze({ $: 'CredentialStatus' });
}

function ml_make_RouteId_AuthDiagnostics() {
  return Object.freeze({ $: 'AuthDiagnostics' });
}

function ml_make_RouteId_EmergencyAuthStatus() {
  return Object.freeze({ $: 'EmergencyAuthStatus' });
}

function ml_make_RouteId_EmergencyAuthDisable() {
  return Object.freeze({ $: 'EmergencyAuthDisable' });
}

function ml_make_RouteId_SubscriptionHealth() {
  return Object.freeze({ $: 'SubscriptionHealth' });
}

function ml_make_RouteId_Metrics() {
  return Object.freeze({ $: 'Metrics' });
}

function ml_make_RouteId_AdminStatus() {
  return Object.freeze({ $: 'AdminStatus' });
}

function ml_make_RouteId_AdminBootstrap() {
  return Object.freeze({ $: 'AdminBootstrap' });
}

function ml_make_RouteId_AdminBootstrapConfirm() {
  return Object.freeze({ $: 'AdminBootstrapConfirm' });
}

function ml_make_RouteId_AdminRotate() {
  return Object.freeze({ $: 'AdminRotate' });
}

function ml_make_RouteId_AdminSummary() {
  return Object.freeze({ $: 'AdminSummary' });
}

function ml_make_RouteId_AnthropicMessages() {
  return Object.freeze({ $: 'AnthropicMessages' });
}

function ml_make_RouteId_AnthropicCountTokens() {
  return Object.freeze({ $: 'AnthropicCountTokens' });
}

function ml_make_RouteId_AnthropicModels() {
  return Object.freeze({ $: 'AnthropicModels' });
}

function ml_make_RouteId_AnthropicModel() {
  return Object.freeze({ $: 'AnthropicModel' });
}

function ml_make_RouteId_OpenAiChatCompletions() {
  return Object.freeze({ $: 'OpenAiChatCompletions' });
}

function ml_make_RouteId_OpenAiChatCompletion() {
  return Object.freeze({ $: 'OpenAiChatCompletion' });
}

function ml_make_RouteId_OpenAiChatCompletionMessages() {
  return Object.freeze({ $: 'OpenAiChatCompletionMessages' });
}

function ml_make_RouteId_OpenAiResponses() {
  return Object.freeze({ $: 'OpenAiResponses' });
}

function ml_make_RouteId_OpenAiResponse() {
  return Object.freeze({ $: 'OpenAiResponse' });
}

function ml_make_RouteId_OpenAiResponseCancel() {
  return Object.freeze({ $: 'OpenAiResponseCancel' });
}

function ml_make_RouteId_OpenAiResponseInputItems() {
  return Object.freeze({ $: 'OpenAiResponseInputItems' });
}

function ml_make_RouteId_OpenAiConversations() {
  return Object.freeze({ $: 'OpenAiConversations' });
}

function ml_make_RouteId_OpenAiConversation() {
  return Object.freeze({ $: 'OpenAiConversation' });
}

function ml_make_RouteId_OpenAiConversationItems() {
  return Object.freeze({ $: 'OpenAiConversationItems' });
}

function ml_make_RouteId_OpenAiConversationItem() {
  return Object.freeze({ $: 'OpenAiConversationItem' });
}

function ml_make_RouteId_OpenAiModels() {
  return Object.freeze({ $: 'OpenAiModels' });
}

function ml_make_RouteId_OpenAiModel() {
  return Object.freeze({ $: 'OpenAiModel' });
}

function ml_make_RouteId_CodexChatCompletions() {
  return Object.freeze({ $: 'CodexChatCompletions' });
}

function ml_make_RouteId_CodexChatCompletion() {
  return Object.freeze({ $: 'CodexChatCompletion' });
}

function ml_make_RouteId_CodexChatCompletionMessages() {
  return Object.freeze({ $: 'CodexChatCompletionMessages' });
}

function ml_make_RouteId_CodexResponses() {
  return Object.freeze({ $: 'CodexResponses' });
}

function ml_make_RouteId_CodexResponse() {
  return Object.freeze({ $: 'CodexResponse' });
}

function ml_make_RouteId_CodexResponseCancel() {
  return Object.freeze({ $: 'CodexResponseCancel' });
}

function ml_make_RouteId_CodexResponseInputItems() {
  return Object.freeze({ $: 'CodexResponseInputItems' });
}

function ml_make_RouteId_CodexConversations() {
  return Object.freeze({ $: 'CodexConversations' });
}

function ml_make_RouteId_CodexConversation() {
  return Object.freeze({ $: 'CodexConversation' });
}

function ml_make_RouteId_CodexConversationItems() {
  return Object.freeze({ $: 'CodexConversationItems' });
}

function ml_make_RouteId_CodexConversationItem() {
  return Object.freeze({ $: 'CodexConversationItem' });
}

function ml_make_RouteId_CodexModels() {
  return Object.freeze({ $: 'CodexModels' });
}

function ml_make_RouteId_CodexModel() {
  return Object.freeze({ $: 'CodexModel' });
}

function ml_make_RouteId_QwenChatCompletions() {
  return Object.freeze({ $: 'QwenChatCompletions' });
}

function ml_make_RouteId_QwenChatCompletion() {
  return Object.freeze({ $: 'QwenChatCompletion' });
}

function ml_make_RouteId_QwenChatCompletionMessages() {
  return Object.freeze({ $: 'QwenChatCompletionMessages' });
}

function ml_make_RouteId_QwenResponses() {
  return Object.freeze({ $: 'QwenResponses' });
}

function ml_make_RouteId_QwenResponse() {
  return Object.freeze({ $: 'QwenResponse' });
}

function ml_make_RouteId_QwenResponseCancel() {
  return Object.freeze({ $: 'QwenResponseCancel' });
}

function ml_make_RouteId_QwenResponseInputItems() {
  return Object.freeze({ $: 'QwenResponseInputItems' });
}

function ml_make_RouteId_QwenConversations() {
  return Object.freeze({ $: 'QwenConversations' });
}

function ml_make_RouteId_QwenConversation() {
  return Object.freeze({ $: 'QwenConversation' });
}

function ml_make_RouteId_QwenConversationItems() {
  return Object.freeze({ $: 'QwenConversationItems' });
}

function ml_make_RouteId_QwenConversationItem() {
  return Object.freeze({ $: 'QwenConversationItem' });
}

function ml_make_RouteId_QwenModels() {
  return Object.freeze({ $: 'QwenModels' });
}

function ml_make_RouteId_QwenModel() {
  return Object.freeze({ $: 'QwenModel' });
}

function ml_make_RouteId_GeminiModels() {
  return Object.freeze({ $: 'GeminiModels' });
}

function ml_make_RouteId_GeminiModel() {
  return Object.freeze({ $: 'GeminiModel' });
}

function ml_make_RouteId_Vertex() {
  return Object.freeze({ $: 'Vertex' });
}

function ml_make_RouteId_AnthropicVertex() {
  return Object.freeze({ $: 'AnthropicVertex' });
}

function ml_make_RouteId_BedrockInvoke() {
  return Object.freeze({ $: 'BedrockInvoke' });
}

function ml_make_RouteId_BedrockInvokeStream() {
  return Object.freeze({ $: 'BedrockInvokeStream' });
}

function ml_make_RouteId_GitHubRest() {
  return Object.freeze({ $: 'GitHubRest' });
}

function ml_make_RouteId_GitHubGraphql() {
  return Object.freeze({ $: 'GitHubGraphql' });
}

function ml_make_RouteId_Git() {
  return Object.freeze({ $: 'Git' });
}

function ml_make_RouteId_GitHubAdapterRest() {
  return Object.freeze({ $: 'GitHubAdapterRest' });
}

function ml_make_RouteId_GitHubAdapterGraphql() {
  return Object.freeze({ $: 'GitHubAdapterGraphql' });
}

function ml_make_RouteId_GitHubAdapterGit() {
  return Object.freeze({ $: 'GitHubAdapterGit' });
}

function ml_make_RouteId_ActivityPubActor() {
  return Object.freeze({ $: 'ActivityPubActor' });
}

function ml_make_RouteId_ActivityPubInbox() {
  return Object.freeze({ $: 'ActivityPubInbox' });
}

function ml_make_RouteId_ActivityPubOutbox() {
  return Object.freeze({ $: 'ActivityPubOutbox' });
}

function ml_make_RouteId_ActivityPubFollowers() {
  return Object.freeze({ $: 'ActivityPubFollowers' });
}

function ml_make_RouteId_ActivityPubFollowProblemsets() {
  return Object.freeze({ $: 'ActivityPubFollowProblemsets' });
}

function ml_make_RouteId_NativeOpenAi() {
  return Object.freeze({ $: 'NativeOpenAi' });
}

function ml_make_RouteId_NativeAnthropic() {
  return Object.freeze({ $: 'NativeAnthropic' });
}

function ml_make_RouteId_NativeCodex() {
  return Object.freeze({ $: 'NativeCodex' });
}

function ml_make_RouteId_NativeCodexBackend() {
  return Object.freeze({ $: 'NativeCodexBackend' });
}

function ml_make_RouteId_AccountPolicy() {
  return Object.freeze({ $: 'AccountPolicy' });
}

function ml_make_RouteId_RequestLog() {
  return Object.freeze({ $: 'RequestLog' });
}

function ml_make_RouteId_ErrorLogs() {
  return Object.freeze({ $: 'ErrorLogs' });
}

function ml_make_RouteId_ErrorLog() {
  return Object.freeze({ $: 'ErrorLog' });
}

function ml_make_RouteId_ClearLogs() {
  return Object.freeze({ $: 'ClearLogs' });
}

function ml_make_RouteId_Logging() {
  return Object.freeze({ $: 'Logging' });
}

function ml_make_RouteId_UsageQueue() {
  return Object.freeze({ $: 'UsageQueue' });
}

function ml_make_RouteId_LatestVersion() {
  return Object.freeze({ $: 'LatestVersion' });
}

function ml_make_RouteId_ModelDefinitions() {
  return Object.freeze({ $: 'ModelDefinitions' });
}

function ml_make_RouteId_Routing() {
  return Object.freeze({ $: 'Routing' });
}

function ml_make_RouteId_CooldownReset() {
  return Object.freeze({ $: 'CooldownReset' });
}

function REMOVED_ROUTES() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Tuple', field0: "GET", field1: "/health" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/health/subscriptions" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/v1/messages" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/v1/chat/completions" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/v1/models" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/api/anthropic/v1/messages" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/api/openai/v1/responses" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/api/codex/v1/responses" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/api/qwen/v1/chat/completions" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/api/gemini/v1beta/models" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/api/vertex/v1/projects/p/locations/l/models/m:rawPredict" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/invoke" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/api/tokens" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/api/providers" }), Object.freeze({ $: 'Tuple', field0: "POST", field1: "/api/login" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/api/admin/status" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/metrics" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/user" }), Object.freeze({ $: 'Tuple', field0: "GET", field1: "/actor/code" })]));
}

export const translated = { ["RouteClass"]: Object.freeze({ ["Neutral"]: ml_make_RouteClass_Neutral, ["Management"]: ml_make_RouteClass_Management, ["Service"]: ml_make_RouteClass_Service }), ["ServiceKind"]: Object.freeze({ ["Anthropic"]: ml_make_ServiceKind_Anthropic, ["OpenAi"]: ml_make_ServiceKind_OpenAi, ["Codex"]: ml_make_ServiceKind_Codex, ["Qwen"]: ml_make_ServiceKind_Qwen, ["Gemini"]: ml_make_ServiceKind_Gemini, ["Vertex"]: ml_make_ServiceKind_Vertex, ["Bedrock"]: ml_make_ServiceKind_Bedrock, ["GitHub"]: ml_make_ServiceKind_GitHub, ["Git"]: ml_make_ServiceKind_Git, ["ActivityPub"]: ml_make_ServiceKind_ActivityPub }), ["ListenerKind"]: Object.freeze({ ["Combined"]: ml_make_ListenerKind_Combined, ["InferenceOnly"]: ml_make_ListenerKind_InferenceOnly, ["Admin"]: ml_make_ListenerKind_Admin, ["GitHubAdapter"]: ml_make_ListenerKind_GitHubAdapter }), ["RouteAuth"]: Object.freeze({ ["None"]: ml_make_RouteAuth_None, ["Client"]: ml_make_RouteAuth_Client, ["Admin"]: ml_make_RouteAuth_Admin }), ["RouteMethod"]: Object.freeze({ ["Get"]: ml_make_RouteMethod_Get, ["Post"]: ml_make_RouteMethod_Post, ["Put"]: ml_make_RouteMethod_Put, ["Patch"]: ml_make_RouteMethod_Patch, ["Delete"]: ml_make_RouteMethod_Delete, ["Any"]: ml_make_RouteMethod_Any }), ["RouteId"]: Object.freeze({ ["Health"]: ml_make_RouteId_Health, ["AggregateModels"]: ml_make_RouteId_AggregateModels, ["SubscriptionUsage"]: ml_make_RouteId_SubscriptionUsage, ["SubscriptionUsageProvider"]: ml_make_RouteId_SubscriptionUsageProvider, ["Tokens"]: ml_make_RouteId_Tokens, ["ClientTokens"]: ml_make_RouteId_ClientTokens, ["RunLease"]: ml_make_RouteId_RunLease, ["RevokeToken"]: ml_make_RouteId_RevokeToken, ["RotateToken"]: ml_make_RouteId_RotateToken, ["RotateClientToken"]: ml_make_RouteId_RotateClientToken, ["Providers"]: ml_make_RouteId_Providers, ["Provider"]: ml_make_RouteId_Provider, ["Login"]: ml_make_RouteId_Login, ["LoginSession"]: ml_make_RouteId_LoginSession, ["LoginCode"]: ml_make_RouteId_LoginCode, ["Usage"]: ml_make_RouteId_Usage, ["Accounts"]: ml_make_RouteId_Accounts, ["AccountPause"]: ml_make_RouteId_AccountPause, ["AccountResume"]: ml_make_RouteId_AccountResume, ["CredentialStatus"]: ml_make_RouteId_CredentialStatus, ["AuthDiagnostics"]: ml_make_RouteId_AuthDiagnostics, ["EmergencyAuthStatus"]: ml_make_RouteId_EmergencyAuthStatus, ["EmergencyAuthDisable"]: ml_make_RouteId_EmergencyAuthDisable, ["SubscriptionHealth"]: ml_make_RouteId_SubscriptionHealth, ["Metrics"]: ml_make_RouteId_Metrics, ["AdminStatus"]: ml_make_RouteId_AdminStatus, ["AdminBootstrap"]: ml_make_RouteId_AdminBootstrap, ["AdminBootstrapConfirm"]: ml_make_RouteId_AdminBootstrapConfirm, ["AdminRotate"]: ml_make_RouteId_AdminRotate, ["AdminSummary"]: ml_make_RouteId_AdminSummary, ["AnthropicMessages"]: ml_make_RouteId_AnthropicMessages, ["AnthropicCountTokens"]: ml_make_RouteId_AnthropicCountTokens, ["AnthropicModels"]: ml_make_RouteId_AnthropicModels, ["AnthropicModel"]: ml_make_RouteId_AnthropicModel, ["OpenAiChatCompletions"]: ml_make_RouteId_OpenAiChatCompletions, ["OpenAiChatCompletion"]: ml_make_RouteId_OpenAiChatCompletion, ["OpenAiChatCompletionMessages"]: ml_make_RouteId_OpenAiChatCompletionMessages, ["OpenAiResponses"]: ml_make_RouteId_OpenAiResponses, ["OpenAiResponse"]: ml_make_RouteId_OpenAiResponse, ["OpenAiResponseCancel"]: ml_make_RouteId_OpenAiResponseCancel, ["OpenAiResponseInputItems"]: ml_make_RouteId_OpenAiResponseInputItems, ["OpenAiConversations"]: ml_make_RouteId_OpenAiConversations, ["OpenAiConversation"]: ml_make_RouteId_OpenAiConversation, ["OpenAiConversationItems"]: ml_make_RouteId_OpenAiConversationItems, ["OpenAiConversationItem"]: ml_make_RouteId_OpenAiConversationItem, ["OpenAiModels"]: ml_make_RouteId_OpenAiModels, ["OpenAiModel"]: ml_make_RouteId_OpenAiModel, ["CodexChatCompletions"]: ml_make_RouteId_CodexChatCompletions, ["CodexChatCompletion"]: ml_make_RouteId_CodexChatCompletion, ["CodexChatCompletionMessages"]: ml_make_RouteId_CodexChatCompletionMessages, ["CodexResponses"]: ml_make_RouteId_CodexResponses, ["CodexResponse"]: ml_make_RouteId_CodexResponse, ["CodexResponseCancel"]: ml_make_RouteId_CodexResponseCancel, ["CodexResponseInputItems"]: ml_make_RouteId_CodexResponseInputItems, ["CodexConversations"]: ml_make_RouteId_CodexConversations, ["CodexConversation"]: ml_make_RouteId_CodexConversation, ["CodexConversationItems"]: ml_make_RouteId_CodexConversationItems, ["CodexConversationItem"]: ml_make_RouteId_CodexConversationItem, ["CodexModels"]: ml_make_RouteId_CodexModels, ["CodexModel"]: ml_make_RouteId_CodexModel, ["QwenChatCompletions"]: ml_make_RouteId_QwenChatCompletions, ["QwenChatCompletion"]: ml_make_RouteId_QwenChatCompletion, ["QwenChatCompletionMessages"]: ml_make_RouteId_QwenChatCompletionMessages, ["QwenResponses"]: ml_make_RouteId_QwenResponses, ["QwenResponse"]: ml_make_RouteId_QwenResponse, ["QwenResponseCancel"]: ml_make_RouteId_QwenResponseCancel, ["QwenResponseInputItems"]: ml_make_RouteId_QwenResponseInputItems, ["QwenConversations"]: ml_make_RouteId_QwenConversations, ["QwenConversation"]: ml_make_RouteId_QwenConversation, ["QwenConversationItems"]: ml_make_RouteId_QwenConversationItems, ["QwenConversationItem"]: ml_make_RouteId_QwenConversationItem, ["QwenModels"]: ml_make_RouteId_QwenModels, ["QwenModel"]: ml_make_RouteId_QwenModel, ["GeminiModels"]: ml_make_RouteId_GeminiModels, ["GeminiModel"]: ml_make_RouteId_GeminiModel, ["Vertex"]: ml_make_RouteId_Vertex, ["AnthropicVertex"]: ml_make_RouteId_AnthropicVertex, ["BedrockInvoke"]: ml_make_RouteId_BedrockInvoke, ["BedrockInvokeStream"]: ml_make_RouteId_BedrockInvokeStream, ["GitHubRest"]: ml_make_RouteId_GitHubRest, ["GitHubGraphql"]: ml_make_RouteId_GitHubGraphql, ["Git"]: ml_make_RouteId_Git, ["GitHubAdapterRest"]: ml_make_RouteId_GitHubAdapterRest, ["GitHubAdapterGraphql"]: ml_make_RouteId_GitHubAdapterGraphql, ["GitHubAdapterGit"]: ml_make_RouteId_GitHubAdapterGit, ["ActivityPubActor"]: ml_make_RouteId_ActivityPubActor, ["ActivityPubInbox"]: ml_make_RouteId_ActivityPubInbox, ["ActivityPubOutbox"]: ml_make_RouteId_ActivityPubOutbox, ["ActivityPubFollowers"]: ml_make_RouteId_ActivityPubFollowers, ["ActivityPubFollowProblemsets"]: ml_make_RouteId_ActivityPubFollowProblemsets, ["NativeOpenAi"]: ml_make_RouteId_NativeOpenAi, ["NativeAnthropic"]: ml_make_RouteId_NativeAnthropic, ["NativeCodex"]: ml_make_RouteId_NativeCodex, ["NativeCodexBackend"]: ml_make_RouteId_NativeCodexBackend, ["AccountPolicy"]: ml_make_RouteId_AccountPolicy, ["RequestLog"]: ml_make_RouteId_RequestLog, ["ErrorLogs"]: ml_make_RouteId_ErrorLogs, ["ErrorLog"]: ml_make_RouteId_ErrorLog, ["ClearLogs"]: ml_make_RouteId_ClearLogs, ["Logging"]: ml_make_RouteId_Logging, ["UsageQueue"]: ml_make_RouteId_UsageQueue, ["LatestVersion"]: ml_make_RouteId_LatestVersion, ["ModelDefinitions"]: ml_make_RouteId_ModelDefinitions, ["Routing"]: ml_make_RouteId_Routing, ["CooldownReset"]: ml_make_RouteId_CooldownReset }), ["REMOVED_ROUTES"]: REMOVED_ROUTES() };
export const provenance = {"sourcePath":"src/route_contract_types.rs","sourceSha256":"9fa5ae69e2dc7aed3a5766a5c7ef79ca236a045840a6305afc92f9573b54629b","executable":7,"executableFunctions":0,"executableConstants":1,"executableTypes":6,"executableConstructors":131,"carried":4,"preserved":11,"runtimeParity":false};
