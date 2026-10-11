// Generated draft from src/refresh.rs; sha256=dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 = {"schemaVersion":1,"types":{"BodyStyle":{"kind":"data","name":"BodyStyle","ctors":[{"name":"Json","fields":[]},{"name":"Form","fields":[]}]}}};

const ml_host_value_refinements_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 = new Map([]);

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 = {"schemaVersion":1,"types":{"RefreshStatusClass":{"kind":"data","name":"RefreshStatusClass","ctors":[{"name":"InvalidGrant","fields":[]},{"name":"InvalidClient","fields":[]},{"name":"UnauthorizedClient","fields":[]},{"name":"UnsupportedGrantType","fields":[]},{"name":"RateLimited","fields":[]},{"name":"ClientRejected","fields":[]},{"name":"Transient","fields":[]},{"name":"UnexpectedStatus","fields":[]}]}}};

const ml_host_value_refinements_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 = new Map([]);

const ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = new Map([]);

const ml_host_value_schema_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 = {"schemaVersion":1,"types":{"ImportRefreshFailureKind":{"kind":"data","name":"ImportRefreshFailureKind","ctors":[{"name":"NotAttempted","fields":[]},{"name":"ExchangeRejected","fields":[]},{"name":"ExchangeUncertain","fields":[]},{"name":"PersistenceUncertain","fields":[]}]}}};

const ml_host_value_refinements_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 = new Map([]);

function ml_make_BodyStyle_Json() {
  return Object.freeze({ $: 'Json' });
}

function ml_make_BodyStyle_Form() {
  return Object.freeze({ $: 'Form' });
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
};

const serde_json = {
  error: {

  },
};

function ml_make_RefreshConfig_RefreshConfig(token_url, client_id, style) {
  if (!(typeof token_url === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_url))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof client_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(client_id))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(style, {"kind":"data","name":"BodyStyle"}, ml_host_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163, { refinements: ml_host_value_refinements_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 });
  return Object.freeze({ $: "RefreshConfig", ["token_url"]: token_url, ["client_id"]: client_id, ["style"]: style });
}

function CLAUDE_OAUTH_USER_AGENT() {
  return "anthropic-sdk-typescript/0.112.1 userOAuthProvider";
}

function ANTHROPIC_SDK_VERSION() {
  return "0.112.1";
}

function GEMINI_CLI_VERSION() {
  return "0.59.0";
}

function GOOGLE_AUTH_LIBRARY_VERSION() {
  return "10.9.0";
}

function QWEN_CODE_VERSION() {
  return "0.23.1";
}

function GEMINI_CLIENT_ID_ENV() {
  return "GEMINI_OAUTH_CLIENT_ID";
}

function GEMINI_CLIENT_SECRET_ENV() {
  return "GEMINI_OAUTH_CLIENT_SECRET";
}

function GEMINI_CLIENT_ID() {
  return "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
}

function GEMINI_AUTH_USER_AGENT() {
  return "google-api-nodejs-client/10.9.0";
}

function GEMINI_API_CLIENT() {
  return "gl-node/22.14.0";
}

function CLAUDE_CLIENT_ID() {
  return "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
}

function CLAUDE_TOKEN_URL() {
  return "https://platform.claude.com/v1/oauth/token";
}

function REFRESH_SKEW_MS() {
  return ml_fixed((5n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function ROTATION_ATTRIBUTION_MS() {
  return ml_fixed((60n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function ml_make_RefreshError_Unsupported() {
  return Object.freeze({ $: 'Unsupported' });
}

function ml_make_RefreshError_NoRefreshToken() {
  return Object.freeze({ $: 'NoRefreshToken' });
}

function ml_make_RefreshError_Request(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Request', field0: field0 });
}

function ml_make_RefreshError_Status(field0, field1, field2) {
  ml_fixed(field0, 0n, 65535n, "u16 argument field0 out of range");
  if (!(typeof field0 === 'bigint' && field0 >= 0n && field0 <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(field1, {"kind":"data","name":"RefreshStatusClass"}, ml_host_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865, { refinements: ml_host_value_refinements_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 });
  ml_validate_rust_value(field2, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  return Object.freeze({ $: 'Status', field0: field0, field1: field1, field2: field2 });
}

function ml_make_RefreshError_Parse(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Parse', field0: field0 });
}

function ml_make_RefreshError_Storage(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Storage', field0: field0 });
}

function ml_make_RefreshStatusClass_InvalidGrant() {
  return Object.freeze({ $: 'InvalidGrant' });
}

function ml_make_RefreshStatusClass_InvalidClient() {
  return Object.freeze({ $: 'InvalidClient' });
}

function ml_make_RefreshStatusClass_UnauthorizedClient() {
  return Object.freeze({ $: 'UnauthorizedClient' });
}

function ml_make_RefreshStatusClass_UnsupportedGrantType() {
  return Object.freeze({ $: 'UnsupportedGrantType' });
}

function ml_make_RefreshStatusClass_RateLimited() {
  return Object.freeze({ $: 'RateLimited' });
}

function ml_make_RefreshStatusClass_ClientRejected() {
  return Object.freeze({ $: 'ClientRejected' });
}

function ml_make_RefreshStatusClass_Transient() {
  return Object.freeze({ $: 'Transient' });
}

function ml_make_RefreshStatusClass_UnexpectedStatus() {
  return Object.freeze({ $: 'UnexpectedStatus' });
}

function ml_make_ImportRefreshFailureKind_NotAttempted() {
  return Object.freeze({ $: 'NotAttempted' });
}

function ml_make_ImportRefreshFailureKind_ExchangeRejected() {
  return Object.freeze({ $: 'ExchangeRejected' });
}

function ml_make_ImportRefreshFailureKind_ExchangeUncertain() {
  return Object.freeze({ $: 'ExchangeUncertain' });
}

function ml_make_ImportRefreshFailureKind_PersistenceUncertain() {
  return Object.freeze({ $: 'PersistenceUncertain' });
}

function ml_make_ImportRefreshFailure_ImportRefreshFailure(kind, message) {
  ml_validate_rust_value(kind, {"kind":"data","name":"ImportRefreshFailureKind"}, ml_host_value_schema_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501, { refinements: ml_host_value_refinements_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ImportRefreshFailure", ["kind"]: kind, ["message"]: message });
}

function ml_make_CredentialEvidence_Working() {
  return Object.freeze({ $: 'Working' });
}

function ml_make_CredentialEvidence_Rejected() {
  return Object.freeze({ $: 'Rejected' });
}

export const translated = { ["BodyStyle"]: Object.freeze({ ["Json"]: ml_make_BodyStyle_Json, ["Form"]: ml_make_BodyStyle_Form }), ["RefreshConfig"]: ml_make_RefreshConfig_RefreshConfig, ["CLAUDE_OAUTH_USER_AGENT"]: CLAUDE_OAUTH_USER_AGENT(), ["ANTHROPIC_SDK_VERSION"]: ANTHROPIC_SDK_VERSION(), ["GEMINI_CLI_VERSION"]: GEMINI_CLI_VERSION(), ["GOOGLE_AUTH_LIBRARY_VERSION"]: GOOGLE_AUTH_LIBRARY_VERSION(), ["QWEN_CODE_VERSION"]: QWEN_CODE_VERSION(), ["GEMINI_CLIENT_ID_ENV"]: GEMINI_CLIENT_ID_ENV(), ["GEMINI_CLIENT_SECRET_ENV"]: GEMINI_CLIENT_SECRET_ENV(), ["GEMINI_CLIENT_ID"]: GEMINI_CLIENT_ID(), ["GEMINI_AUTH_USER_AGENT"]: GEMINI_AUTH_USER_AGENT(), ["GEMINI_API_CLIENT"]: GEMINI_API_CLIENT(), ["CLAUDE_CLIENT_ID"]: CLAUDE_CLIENT_ID(), ["CLAUDE_TOKEN_URL"]: CLAUDE_TOKEN_URL(), ["REFRESH_SKEW_MS"]: REFRESH_SKEW_MS(), ["ROTATION_ATTRIBUTION_MS"]: ROTATION_ATTRIBUTION_MS(), ["RefreshError"]: Object.freeze({ ["Unsupported"]: ml_make_RefreshError_Unsupported, ["NoRefreshToken"]: ml_make_RefreshError_NoRefreshToken, ["Request"]: ml_make_RefreshError_Request, ["Status"]: ml_make_RefreshError_Status, ["Parse"]: ml_make_RefreshError_Parse, ["Storage"]: ml_make_RefreshError_Storage }), ["RefreshStatusClass"]: Object.freeze({ ["InvalidGrant"]: ml_make_RefreshStatusClass_InvalidGrant, ["InvalidClient"]: ml_make_RefreshStatusClass_InvalidClient, ["UnauthorizedClient"]: ml_make_RefreshStatusClass_UnauthorizedClient, ["UnsupportedGrantType"]: ml_make_RefreshStatusClass_UnsupportedGrantType, ["RateLimited"]: ml_make_RefreshStatusClass_RateLimited, ["ClientRejected"]: ml_make_RefreshStatusClass_ClientRejected, ["Transient"]: ml_make_RefreshStatusClass_Transient, ["UnexpectedStatus"]: ml_make_RefreshStatusClass_UnexpectedStatus }), ["ImportRefreshFailureKind"]: Object.freeze({ ["NotAttempted"]: ml_make_ImportRefreshFailureKind_NotAttempted, ["ExchangeRejected"]: ml_make_ImportRefreshFailureKind_ExchangeRejected, ["ExchangeUncertain"]: ml_make_ImportRefreshFailureKind_ExchangeUncertain, ["PersistenceUncertain"]: ml_make_ImportRefreshFailureKind_PersistenceUncertain }), ["ImportRefreshFailure"]: ml_make_ImportRefreshFailure_ImportRefreshFailure, ["CredentialEvidence"]: Object.freeze({ ["Working"]: ml_make_CredentialEvidence_Working, ["Rejected"]: ml_make_CredentialEvidence_Rejected }) };
export const provenance = {"sourcePath":"src/refresh.rs","sourceSha256":"dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108","executable":21,"executableFunctions":0,"executableConstants":14,"executableTypes":7,"executableConstructors":24,"carried":45,"preserved":67,"runtimeParity":false};
