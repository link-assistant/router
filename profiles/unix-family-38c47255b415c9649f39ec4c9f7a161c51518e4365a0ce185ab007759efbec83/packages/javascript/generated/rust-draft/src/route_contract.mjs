// Generated draft from src/route_contract.rs; sha256=a4a58d9a6054aada46879b16dbf9593c3a1c939e5602cc503dd1c327c5795ec1
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_ec7bb30cf0f44f54933681b10a3b5e41e65704c0692c309dbf1d33702f128199 = {"schemaVersion":1,"types":{"rp_726f7574655f636f6e74726163742e74797065732e526f75746553706563":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746553706563","ctors":[{"name":"RouteSpec","fields":[{"name":"id","type":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964"}},{"name":"method","type":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64"}},{"name":"template","type":{"kind":"string"}},{"name":"class","type":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373"}},{"name":"auth","type":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746541757468"}},{"name":"dialect","type":{"kind":"data","name":"rp_6170695f6572726f722e4170694469616c656374"}},{"name":"listeners","type":{"kind":"array","element":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e4c697374656e65724b696e64"}}}]}]},"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964","ctors":[{"name":"Health","fields":[]},{"name":"AggregateModels","fields":[]},{"name":"SubscriptionUsage","fields":[]},{"name":"SubscriptionUsageProvider","fields":[]},{"name":"Tokens","fields":[]},{"name":"ClientTokens","fields":[]},{"name":"RunLease","fields":[]},{"name":"RevokeToken","fields":[]},{"name":"RotateToken","fields":[]},{"name":"RotateClientToken","fields":[]},{"name":"Providers","fields":[]},{"name":"Provider","fields":[]},{"name":"Login","fields":[]},{"name":"LoginSession","fields":[]},{"name":"LoginCode","fields":[]},{"name":"Usage","fields":[]},{"name":"Accounts","fields":[]},{"name":"AccountPause","fields":[]},{"name":"AccountResume","fields":[]},{"name":"CredentialStatus","fields":[]},{"name":"AuthDiagnostics","fields":[]},{"name":"EmergencyAuthStatus","fields":[]},{"name":"EmergencyAuthDisable","fields":[]},{"name":"SubscriptionHealth","fields":[]},{"name":"Metrics","fields":[]},{"name":"AdminStatus","fields":[]},{"name":"AdminBootstrap","fields":[]},{"name":"AdminBootstrapConfirm","fields":[]},{"name":"AdminRotate","fields":[]},{"name":"AdminSummary","fields":[]},{"name":"AnthropicMessages","fields":[]},{"name":"AnthropicCountTokens","fields":[]},{"name":"AnthropicModels","fields":[]},{"name":"AnthropicModel","fields":[]},{"name":"OpenAiChatCompletions","fields":[]},{"name":"OpenAiChatCompletion","fields":[]},{"name":"OpenAiChatCompletionMessages","fields":[]},{"name":"OpenAiResponses","fields":[]},{"name":"OpenAiResponse","fields":[]},{"name":"OpenAiResponseCancel","fields":[]},{"name":"OpenAiResponseInputItems","fields":[]},{"name":"OpenAiConversations","fields":[]},{"name":"OpenAiConversation","fields":[]},{"name":"OpenAiConversationItems","fields":[]},{"name":"OpenAiConversationItem","fields":[]},{"name":"OpenAiModels","fields":[]},{"name":"OpenAiModel","fields":[]},{"name":"CodexChatCompletions","fields":[]},{"name":"CodexChatCompletion","fields":[]},{"name":"CodexChatCompletionMessages","fields":[]},{"name":"CodexResponses","fields":[]},{"name":"CodexResponse","fields":[]},{"name":"CodexResponseCancel","fields":[]},{"name":"CodexResponseInputItems","fields":[]},{"name":"CodexConversations","fields":[]},{"name":"CodexConversation","fields":[]},{"name":"CodexConversationItems","fields":[]},{"name":"CodexConversationItem","fields":[]},{"name":"CodexModels","fields":[]},{"name":"CodexModel","fields":[]},{"name":"QwenChatCompletions","fields":[]},{"name":"QwenChatCompletion","fields":[]},{"name":"QwenChatCompletionMessages","fields":[]},{"name":"QwenResponses","fields":[]},{"name":"QwenResponse","fields":[]},{"name":"QwenResponseCancel","fields":[]},{"name":"QwenResponseInputItems","fields":[]},{"name":"QwenConversations","fields":[]},{"name":"QwenConversation","fields":[]},{"name":"QwenConversationItems","fields":[]},{"name":"QwenConversationItem","fields":[]},{"name":"QwenModels","fields":[]},{"name":"QwenModel","fields":[]},{"name":"GeminiModels","fields":[]},{"name":"GeminiModel","fields":[]},{"name":"Vertex","fields":[]},{"name":"AnthropicVertex","fields":[]},{"name":"BedrockInvoke","fields":[]},{"name":"BedrockInvokeStream","fields":[]},{"name":"GitHubRest","fields":[]},{"name":"GitHubGraphql","fields":[]},{"name":"Git","fields":[]},{"name":"GitHubAdapterRest","fields":[]},{"name":"GitHubAdapterGraphql","fields":[]},{"name":"GitHubAdapterGit","fields":[]},{"name":"ActivityPubActor","fields":[]},{"name":"ActivityPubInbox","fields":[]},{"name":"ActivityPubOutbox","fields":[]},{"name":"ActivityPubFollowers","fields":[]},{"name":"ActivityPubFollowProblemsets","fields":[]},{"name":"NativeOpenAi","fields":[]},{"name":"NativeAnthropic","fields":[]},{"name":"NativeCodex","fields":[]},{"name":"NativeCodexBackend","fields":[]},{"name":"AccountPolicy","fields":[]},{"name":"RequestLog","fields":[]},{"name":"ErrorLogs","fields":[]},{"name":"ErrorLog","fields":[]},{"name":"ClearLogs","fields":[]},{"name":"Logging","fields":[]},{"name":"UsageQueue","fields":[]},{"name":"LatestVersion","fields":[]},{"name":"ModelDefinitions","fields":[]},{"name":"Routing","fields":[]},{"name":"CooldownReset","fields":[]}]},"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64","ctors":[{"name":"Get","fields":[]},{"name":"Post","fields":[]},{"name":"Put","fields":[]},{"name":"Patch","fields":[]},{"name":"Delete","fields":[]},{"name":"Any","fields":[]}]},"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373","ctors":[{"name":"Neutral","fields":[]},{"name":"Management","fields":[]},{"name":"Service","fields":[{"name":"field0","type":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64"}}]}]},"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]},{"name":"Qwen","fields":[]},{"name":"Gemini","fields":[]},{"name":"Vertex","fields":[]},{"name":"Bedrock","fields":[]},{"name":"GitHub","fields":[]},{"name":"Git","fields":[]},{"name":"ActivityPub","fields":[]}]},"rp_726f7574655f636f6e74726163742e74797065732e526f75746541757468":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746541757468","ctors":[{"name":"None","fields":[]},{"name":"Client","fields":[]},{"name":"Admin","fields":[]}]},"rp_6170695f6572726f722e4170694469616c656374":{"kind":"data","name":"rp_6170695f6572726f722e4170694469616c656374","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"Gemini","fields":[]},{"name":"GitHub","fields":[]}]},"rp_726f7574655f636f6e74726163742e74797065732e4c697374656e65724b696e64":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e4c697374656e65724b696e64","ctors":[{"name":"Combined","fields":[]},{"name":"InferenceOnly","fields":[]},{"name":"Admin","fields":[]},{"name":"GitHubAdapter","fields":[]}]}}};

const ml_host_value_schema_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7 = {"schemaVersion":1,"types":{"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964","ctors":[{"name":"Health","fields":[]},{"name":"AggregateModels","fields":[]},{"name":"SubscriptionUsage","fields":[]},{"name":"SubscriptionUsageProvider","fields":[]},{"name":"Tokens","fields":[]},{"name":"ClientTokens","fields":[]},{"name":"RunLease","fields":[]},{"name":"RevokeToken","fields":[]},{"name":"RotateToken","fields":[]},{"name":"RotateClientToken","fields":[]},{"name":"Providers","fields":[]},{"name":"Provider","fields":[]},{"name":"Login","fields":[]},{"name":"LoginSession","fields":[]},{"name":"LoginCode","fields":[]},{"name":"Usage","fields":[]},{"name":"Accounts","fields":[]},{"name":"AccountPause","fields":[]},{"name":"AccountResume","fields":[]},{"name":"CredentialStatus","fields":[]},{"name":"AuthDiagnostics","fields":[]},{"name":"EmergencyAuthStatus","fields":[]},{"name":"EmergencyAuthDisable","fields":[]},{"name":"SubscriptionHealth","fields":[]},{"name":"Metrics","fields":[]},{"name":"AdminStatus","fields":[]},{"name":"AdminBootstrap","fields":[]},{"name":"AdminBootstrapConfirm","fields":[]},{"name":"AdminRotate","fields":[]},{"name":"AdminSummary","fields":[]},{"name":"AnthropicMessages","fields":[]},{"name":"AnthropicCountTokens","fields":[]},{"name":"AnthropicModels","fields":[]},{"name":"AnthropicModel","fields":[]},{"name":"OpenAiChatCompletions","fields":[]},{"name":"OpenAiChatCompletion","fields":[]},{"name":"OpenAiChatCompletionMessages","fields":[]},{"name":"OpenAiResponses","fields":[]},{"name":"OpenAiResponse","fields":[]},{"name":"OpenAiResponseCancel","fields":[]},{"name":"OpenAiResponseInputItems","fields":[]},{"name":"OpenAiConversations","fields":[]},{"name":"OpenAiConversation","fields":[]},{"name":"OpenAiConversationItems","fields":[]},{"name":"OpenAiConversationItem","fields":[]},{"name":"OpenAiModels","fields":[]},{"name":"OpenAiModel","fields":[]},{"name":"CodexChatCompletions","fields":[]},{"name":"CodexChatCompletion","fields":[]},{"name":"CodexChatCompletionMessages","fields":[]},{"name":"CodexResponses","fields":[]},{"name":"CodexResponse","fields":[]},{"name":"CodexResponseCancel","fields":[]},{"name":"CodexResponseInputItems","fields":[]},{"name":"CodexConversations","fields":[]},{"name":"CodexConversation","fields":[]},{"name":"CodexConversationItems","fields":[]},{"name":"CodexConversationItem","fields":[]},{"name":"CodexModels","fields":[]},{"name":"CodexModel","fields":[]},{"name":"QwenChatCompletions","fields":[]},{"name":"QwenChatCompletion","fields":[]},{"name":"QwenChatCompletionMessages","fields":[]},{"name":"QwenResponses","fields":[]},{"name":"QwenResponse","fields":[]},{"name":"QwenResponseCancel","fields":[]},{"name":"QwenResponseInputItems","fields":[]},{"name":"QwenConversations","fields":[]},{"name":"QwenConversation","fields":[]},{"name":"QwenConversationItems","fields":[]},{"name":"QwenConversationItem","fields":[]},{"name":"QwenModels","fields":[]},{"name":"QwenModel","fields":[]},{"name":"GeminiModels","fields":[]},{"name":"GeminiModel","fields":[]},{"name":"Vertex","fields":[]},{"name":"AnthropicVertex","fields":[]},{"name":"BedrockInvoke","fields":[]},{"name":"BedrockInvokeStream","fields":[]},{"name":"GitHubRest","fields":[]},{"name":"GitHubGraphql","fields":[]},{"name":"Git","fields":[]},{"name":"GitHubAdapterRest","fields":[]},{"name":"GitHubAdapterGraphql","fields":[]},{"name":"GitHubAdapterGit","fields":[]},{"name":"ActivityPubActor","fields":[]},{"name":"ActivityPubInbox","fields":[]},{"name":"ActivityPubOutbox","fields":[]},{"name":"ActivityPubFollowers","fields":[]},{"name":"ActivityPubFollowProblemsets","fields":[]},{"name":"NativeOpenAi","fields":[]},{"name":"NativeAnthropic","fields":[]},{"name":"NativeCodex","fields":[]},{"name":"NativeCodexBackend","fields":[]},{"name":"AccountPolicy","fields":[]},{"name":"RequestLog","fields":[]},{"name":"ErrorLogs","fields":[]},{"name":"ErrorLog","fields":[]},{"name":"ClearLogs","fields":[]},{"name":"Logging","fields":[]},{"name":"UsageQueue","fields":[]},{"name":"LatestVersion","fields":[]},{"name":"ModelDefinitions","fields":[]},{"name":"Routing","fields":[]},{"name":"CooldownReset","fields":[]}]}}};

const ml_host_value_refinements_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7 = new Map([]);

const ml_host_value_schema_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e = {"schemaVersion":1,"types":{"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64","ctors":[{"name":"Get","fields":[]},{"name":"Post","fields":[]},{"name":"Put","fields":[]},{"name":"Patch","fields":[]},{"name":"Delete","fields":[]},{"name":"Any","fields":[]}]}}};

const ml_host_value_refinements_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e = new Map([]);

const ml_constructor_value_schema_a8cc04f88bc06b5e3ae00ed02bee48bc746319415404c8006567e01a960171cf = {"schemaVersion":1,"types":{"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373","ctors":[{"name":"Neutral","fields":[]},{"name":"Management","fields":[]},{"name":"Service","fields":[{"name":"field0","type":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64"}}]}]},"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]},{"name":"Qwen","fields":[]},{"name":"Gemini","fields":[]},{"name":"Vertex","fields":[]},{"name":"Bedrock","fields":[]},{"name":"GitHub","fields":[]},{"name":"Git","fields":[]},{"name":"ActivityPub","fields":[]}]}}};

const ml_host_value_schema_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 = {"schemaVersion":1,"types":{"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]},{"name":"Qwen","fields":[]},{"name":"Gemini","fields":[]},{"name":"Vertex","fields":[]},{"name":"Bedrock","fields":[]},{"name":"GitHub","fields":[]},{"name":"Git","fields":[]},{"name":"ActivityPub","fields":[]}]}}};

const ml_host_value_refinements_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 = new Map([]);

const ml_host_value_schema_2c3f4e05b63ed62da7a2f15d79e340fe3f479863971b41058bdfa179a88d5ebf = {"schemaVersion":1,"types":{"rp_6170695f6572726f722e4170694469616c656374":{"kind":"data","name":"rp_6170695f6572726f722e4170694469616c656374","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"Gemini","fields":[]},{"name":"GitHub","fields":[]}]}}};

const ml_host_value_refinements_2c3f4e05b63ed62da7a2f15d79e340fe3f479863971b41058bdfa179a88d5ebf = new Map([]);

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f494e464552454e4345() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Combined' }), Object.freeze({ $: 'InferenceOnly' })]));
}

function rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f41444d494e() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Combined' }), Object.freeze({ $: 'Admin' })]));
}

function rp_726f7574655f636f6e74726163742e434f4d42494e45445f4f4e4c59() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Combined' })]));
}

function rp_726f7574655f636f6e74726163742e4749544855425f414441505445525f4f4e4c59() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'GitHubAdapter' })]));
}

function rp_726f7574655f636f6e74726163742e6e65757472616c(id, method, template) {
  ml_validate_rust_value(id, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964"}, ml_host_value_schema_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7, { refinements: ml_host_value_refinements_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7 });
  ml_validate_rust_value(method, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64"}, ml_host_value_schema_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e, { refinements: ml_host_value_refinements_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e });
  if (!(typeof template === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(template))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = id;
  const ml_record2 = method;
  const ml_record3 = template;
  const ml_record4 = Object.freeze({ $: 'Neutral' });
  const ml_record5 = Object.freeze({ $: 'None' });
  const ml_record6 = Object.freeze({ $: 'Anthropic' });
  const ml_record7 = rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f494e464552454e4345();
  return ml_snapshot_constructor_value(Object.freeze({ $: "RouteSpec", ["id"]: ml_record1, ["method"]: ml_record2, ["template"]: ml_record3, ["class"]: ml_record4, ["auth"]: ml_record5, ["dialect"]: ml_record6, ["listeners"]: ml_record7 }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746553706563"}, ml_constructor_value_schema_ec7bb30cf0f44f54933681b10a3b5e41e65704c0692c309dbf1d33702f128199);
}

function rp_726f7574655f636f6e74726163742e6d616e6167656d656e74(id, method, template) {
  ml_validate_rust_value(id, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964"}, ml_host_value_schema_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7, { refinements: ml_host_value_refinements_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7 });
  ml_validate_rust_value(method, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64"}, ml_host_value_schema_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e, { refinements: ml_host_value_refinements_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e });
  if (!(typeof template === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(template))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = id;
  const ml_record2 = method;
  const ml_record3 = template;
  const ml_record4 = Object.freeze({ $: 'Management' });
  const ml_record5 = Object.freeze({ $: 'Admin' });
  const ml_record6 = Object.freeze({ $: 'Anthropic' });
  const ml_record7 = rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f41444d494e();
  return ml_snapshot_constructor_value(Object.freeze({ $: "RouteSpec", ["id"]: ml_record1, ["method"]: ml_record2, ["template"]: ml_record3, ["class"]: ml_record4, ["auth"]: ml_record5, ["dialect"]: ml_record6, ["listeners"]: ml_record7 }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746553706563"}, ml_constructor_value_schema_ec7bb30cf0f44f54933681b10a3b5e41e65704c0692c309dbf1d33702f128199);
}

function rp_726f7574655f636f6e74726163742e61695f73657276696365(id, method, template, service, dialect) {
  ml_validate_rust_value(id, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964"}, ml_host_value_schema_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7, { refinements: ml_host_value_refinements_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7 });
  ml_validate_rust_value(method, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64"}, ml_host_value_schema_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e, { refinements: ml_host_value_refinements_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e });
  if (!(typeof template === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(template))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(service, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64"}, ml_host_value_schema_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0, { refinements: ml_host_value_refinements_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 });
  ml_validate_rust_value(dialect, {"kind":"data","name":"rp_6170695f6572726f722e4170694469616c656374"}, ml_host_value_schema_2c3f4e05b63ed62da7a2f15d79e340fe3f479863971b41058bdfa179a88d5ebf, { refinements: ml_host_value_refinements_2c3f4e05b63ed62da7a2f15d79e340fe3f479863971b41058bdfa179a88d5ebf });
  const ml_record1 = id;
  const ml_record2 = method;
  const ml_record3 = template;
  const ml_record4 = ml_snapshot_constructor_value(Object.freeze({ $: 'Service', field0: service }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373"}, ml_constructor_value_schema_a8cc04f88bc06b5e3ae00ed02bee48bc746319415404c8006567e01a960171cf);
  const ml_record5 = Object.freeze({ $: 'Client' });
  const ml_record6 = dialect;
  const ml_record7 = rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f494e464552454e4345();
  return ml_snapshot_constructor_value(Object.freeze({ $: "RouteSpec", ["id"]: ml_record1, ["method"]: ml_record2, ["template"]: ml_record3, ["class"]: ml_record4, ["auth"]: ml_record5, ["dialect"]: ml_record6, ["listeners"]: ml_record7 }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746553706563"}, ml_constructor_value_schema_ec7bb30cf0f44f54933681b10a3b5e41e65704c0692c309dbf1d33702f128199);
}

function rp_726f7574655f636f6e74726163742e707269766174655f73657276696365(id, method, template, service, dialect) {
  ml_validate_rust_value(id, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964"}, ml_host_value_schema_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7, { refinements: ml_host_value_refinements_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7 });
  ml_validate_rust_value(method, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64"}, ml_host_value_schema_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e, { refinements: ml_host_value_refinements_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e });
  if (!(typeof template === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(template))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(service, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64"}, ml_host_value_schema_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0, { refinements: ml_host_value_refinements_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 });
  ml_validate_rust_value(dialect, {"kind":"data","name":"rp_6170695f6572726f722e4170694469616c656374"}, ml_host_value_schema_2c3f4e05b63ed62da7a2f15d79e340fe3f479863971b41058bdfa179a88d5ebf, { refinements: ml_host_value_refinements_2c3f4e05b63ed62da7a2f15d79e340fe3f479863971b41058bdfa179a88d5ebf });
  const ml_record1 = id;
  const ml_record2 = method;
  const ml_record3 = template;
  const ml_record4 = ml_snapshot_constructor_value(Object.freeze({ $: 'Service', field0: service }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373"}, ml_constructor_value_schema_a8cc04f88bc06b5e3ae00ed02bee48bc746319415404c8006567e01a960171cf);
  const ml_record5 = Object.freeze({ $: 'Client' });
  const ml_record6 = dialect;
  const ml_record7 = rp_726f7574655f636f6e74726163742e434f4d42494e45445f4f4e4c59();
  return ml_snapshot_constructor_value(Object.freeze({ $: "RouteSpec", ["id"]: ml_record1, ["method"]: ml_record2, ["template"]: ml_record3, ["class"]: ml_record4, ["auth"]: ml_record5, ["dialect"]: ml_record6, ["listeners"]: ml_record7 }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746553706563"}, ml_constructor_value_schema_ec7bb30cf0f44f54933681b10a3b5e41e65704c0692c309dbf1d33702f128199);
}

function rp_726f7574655f636f6e74726163742e6769746875625f616461707465725f73657276696365(id, method, template, service) {
  ml_validate_rust_value(id, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654964"}, ml_host_value_schema_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7, { refinements: ml_host_value_refinements_a0a1b814adaf3838855f3c3dba574fc45a78fdd7f96b86404ccaada92a852aa7 });
  ml_validate_rust_value(method, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f7574654d6574686f64"}, ml_host_value_schema_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e, { refinements: ml_host_value_refinements_c65d1d87234f2a8cf0cafd46b6559baa133ad2b460e324053fcdb719a5ea627e });
  if (!(typeof template === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(template))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(service, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64"}, ml_host_value_schema_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0, { refinements: ml_host_value_refinements_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 });
  const ml_record1 = id;
  const ml_record2 = method;
  const ml_record3 = template;
  const ml_record4 = ml_snapshot_constructor_value(Object.freeze({ $: 'Service', field0: service }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f757465436c617373"}, ml_constructor_value_schema_a8cc04f88bc06b5e3ae00ed02bee48bc746319415404c8006567e01a960171cf);
  const ml_record5 = Object.freeze({ $: 'Client' });
  const ml_record6 = Object.freeze({ $: 'GitHub' });
  const ml_record7 = rp_726f7574655f636f6e74726163742e4749544855425f414441505445525f4f4e4c59();
  return ml_snapshot_constructor_value(Object.freeze({ $: "RouteSpec", ["id"]: ml_record1, ["method"]: ml_record2, ["template"]: ml_record3, ["class"]: ml_record4, ["auth"]: ml_record5, ["dialect"]: ml_record6, ["listeners"]: ml_record7 }), {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e526f75746553706563"}, ml_constructor_value_schema_ec7bb30cf0f44f54933681b10a3b5e41e65704c0692c309dbf1d33702f128199);
}

function rp_726f7574655f636f6e74726163742e736572766963655f626173655f70617468(service) {
  ml_validate_rust_value(service, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64"}, ml_host_value_schema_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0, { refinements: ml_host_value_refinements_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 });
  switch (service.$) {
    case "Anthropic": {
      return "/api/services/anthropic";
    }
    case "OpenAi": {
      return "/api/services/openai/v1";
    }
    case "Codex": {
      return "/api/services/codex/v1";
    }
    case "Qwen": {
      return "/api/services/qwen/v1";
    }
    case "Gemini": {
      return "/api/services/gemini";
    }
    case "Vertex": {
      return "/api/services/vertex/v1";
    }
    case "Bedrock": {
      return "/api/services/bedrock";
    }
    case "GitHub": {
      return "/api/services/github/api/v3";
    }
    case "Git": {
      return "/api/services/github/git";
    }
    case "ActivityPub": {
      return "/api/services/activitypub";
    }
    default: {
      return ml_router_unexpected(service);
    }
  }
}

export const translated = { ["COMBINED_AND_INFERENCE"]: rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f494e464552454e4345(), ["COMBINED_AND_ADMIN"]: rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f41444d494e(), ["COMBINED_ONLY"]: rp_726f7574655f636f6e74726163742e434f4d42494e45445f4f4e4c59(), ["GITHUB_ADAPTER_ONLY"]: rp_726f7574655f636f6e74726163742e4749544855425f414441505445525f4f4e4c59(), ["neutral"]: rp_726f7574655f636f6e74726163742e6e65757472616c, ["management"]: rp_726f7574655f636f6e74726163742e6d616e6167656d656e74, ["ai_service"]: rp_726f7574655f636f6e74726163742e61695f73657276696365, ["private_service"]: rp_726f7574655f636f6e74726163742e707269766174655f73657276696365, ["github_adapter_service"]: rp_726f7574655f636f6e74726163742e6769746875625f616461707465725f73657276696365, ["service_base_path"]: rp_726f7574655f636f6e74726163742e736572766963655f626173655f70617468 };
export const provenance = {"sourcePath":"src/route_contract.rs","sourceSha256":"a4a58d9a6054aada46879b16dbf9593c3a1c939e5602cc503dd1c327c5795ec1","executable":10,"executableFunctions":6,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":19,"preserved":30,"runtimeParity":false};
