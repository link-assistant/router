// Generated draft from rust/src/refresh.rs; sha256=dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 = {"schemaVersion":1,"types":{"BodyStyle":{"kind":"data","name":"BodyStyle","ctors":[{"name":"Json","fields":[]},{"name":"Form","fields":[]}]}}};

const ml_constructor_value_schema_c425f11a26646de07c6d9fb0eaa96bc741052d4fdfff7d4670448cf199d7268c = {"schemaVersion":1,"types":{"RefreshConfig":{"kind":"data","name":"RefreshConfig","ctors":[{"name":"RefreshConfig","fields":[{"name":"token_url","type":{"kind":"string"}},{"name":"client_id","type":{"kind":"string"}},{"name":"style","type":{"kind":"data","name":"BodyStyle"}}]}]},"BodyStyle":{"kind":"data","name":"BodyStyle","ctors":[{"name":"Json","fields":[]},{"name":"Form","fields":[]}]}}};

const ml_host_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 = {"schemaVersion":1,"types":{"BodyStyle":{"kind":"data","name":"BodyStyle","ctors":[{"name":"Json","fields":[]},{"name":"Form","fields":[]}]}}};

const ml_host_value_refinements_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 = new Map([]);

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_constructor_value_schema_9c3a44a92f23e59acc6ff518078611b977e04aa540dcce66edad2a7b242d9492 = {"schemaVersion":1,"types":{"rp_726566726573682e52656672657368436f6e666967":{"kind":"data","name":"rp_726566726573682e52656672657368436f6e666967","ctors":[{"name":"RefreshConfig","fields":[{"name":"token_url","type":{"kind":"string"}},{"name":"client_id","type":{"kind":"string"}},{"name":"style","type":{"kind":"data","name":"rp_726566726573682e426f64795374796c65"}}]}]},"rp_726566726573682e426f64795374796c65":{"kind":"data","name":"rp_726566726573682e426f64795374796c65","ctors":[{"name":"Json","fields":[]},{"name":"Form","fields":[]}]}}};

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = {"schemaVersion":1,"types":{"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572","ctors":[{"name":"Claude","fields":[]},{"name":"Codex","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

const ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = new Map([]);

const ml_constructor_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 = {"schemaVersion":1,"types":{"RefreshStatusClass":{"kind":"data","name":"RefreshStatusClass","ctors":[{"name":"InvalidGrant","fields":[]},{"name":"InvalidClient","fields":[]},{"name":"UnauthorizedClient","fields":[]},{"name":"UnsupportedGrantType","fields":[]},{"name":"RateLimited","fields":[]},{"name":"ClientRejected","fields":[]},{"name":"Transient","fields":[]},{"name":"UnexpectedStatus","fields":[]}]}}};

const ml_constructor_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_constructor_value_schema_625cbd19bbf92116746225c08afbcbe7d10e648ca34045d483ea94f9f67701ba = {"schemaVersion":1,"types":{"RefreshError":{"kind":"data","name":"RefreshError","ctors":[{"name":"Unsupported","fields":[]},{"name":"NoRefreshToken","fields":[]},{"name":"Request","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Status","fields":[{"name":"field0","type":{"kind":"fixed","bits":16,"signed":false}},{"name":"field1","type":{"kind":"data","name":"RefreshStatusClass"}},{"name":"field2","type":{"kind":"data","name":"RouterOption_3_i64"}}]},{"name":"Parse","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Storage","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"RefreshStatusClass":{"kind":"data","name":"RefreshStatusClass","ctors":[{"name":"InvalidGrant","fields":[]},{"name":"InvalidClient","fields":[]},{"name":"UnauthorizedClient","fields":[]},{"name":"UnsupportedGrantType","fields":[]},{"name":"RateLimited","fields":[]},{"name":"ClientRejected","fields":[]},{"name":"Transient","fields":[]},{"name":"UnexpectedStatus","fields":[]}]},"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 = {"schemaVersion":1,"types":{"RefreshStatusClass":{"kind":"data","name":"RefreshStatusClass","ctors":[{"name":"InvalidGrant","fields":[]},{"name":"InvalidClient","fields":[]},{"name":"UnauthorizedClient","fields":[]},{"name":"UnsupportedGrantType","fields":[]},{"name":"RateLimited","fields":[]},{"name":"ClientRejected","fields":[]},{"name":"Transient","fields":[]},{"name":"UnexpectedStatus","fields":[]}]}}};

const ml_host_value_refinements_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 = new Map([]);

const ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = new Map([]);

const ml_constructor_value_schema_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 = {"schemaVersion":1,"types":{"ImportRefreshFailureKind":{"kind":"data","name":"ImportRefreshFailureKind","ctors":[{"name":"NotAttempted","fields":[]},{"name":"ExchangeRejected","fields":[]},{"name":"ExchangeUncertain","fields":[]},{"name":"PersistenceUncertain","fields":[]}]}}};

const ml_constructor_value_schema_4e62c49d42904546bad75d34c442cd28f8aa320f3135ce64213aaebac70a5e9c = {"schemaVersion":1,"types":{"ImportRefreshFailure":{"kind":"data","name":"ImportRefreshFailure","ctors":[{"name":"ImportRefreshFailure","fields":[{"name":"kind","type":{"kind":"data","name":"ImportRefreshFailureKind"}},{"name":"message","type":{"kind":"string"}}]}]},"ImportRefreshFailureKind":{"kind":"data","name":"ImportRefreshFailureKind","ctors":[{"name":"NotAttempted","fields":[]},{"name":"ExchangeRejected","fields":[]},{"name":"ExchangeUncertain","fields":[]},{"name":"PersistenceUncertain","fields":[]}]}}};

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
  num: {

  },
};

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

function ml_make_RefreshConfig_RefreshConfig(token_url, client_id, style) {
  if (!(typeof token_url === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_url))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof client_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(client_id))) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(style, {"kind":"data","name":"BodyStyle"}, ml_constructor_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163);
  ml_validate_rust_value(style, {"kind":"data","name":"BodyStyle"}, ml_host_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163, { refinements: ml_host_value_refinements_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 });
  return ml_snapshot_constructor_value(Object.freeze({ $: "RefreshConfig", ["token_url"]: token_url, ["client_id"]: client_id, ["style"]: style }), {"kind":"data","name":"RefreshConfig"}, ml_constructor_value_schema_c425f11a26646de07c6d9fb0eaa96bc741052d4fdfff7d4670448cf199d7268c);
}

function rp_726566726573682e434c415544455f4f415554485f555345525f4147454e54() {
  return "anthropic-sdk-typescript/0.112.1 userOAuthProvider";
}

function rp_726566726573682e414e5448524f5049435f53444b5f56455253494f4e() {
  return "0.112.1";
}

function rp_726566726573682e47454d494e495f434c495f56455253494f4e() {
  return "0.59.0";
}

function rp_726566726573682e474f4f474c455f415554485f4c4942524152595f56455253494f4e() {
  return "10.9.0";
}

function rp_726566726573682e5157454e5f434f44455f56455253494f4e() {
  return "0.23.1";
}

function rp_726566726573682e47454d494e495f434c49454e545f49445f454e56() {
  return "GEMINI_OAUTH_CLIENT_ID";
}

function rp_726566726573682e47454d494e495f434c49454e545f5345435245545f454e56() {
  return "GEMINI_OAUTH_CLIENT_SECRET";
}

function rp_726566726573682e47454d494e495f434c49454e545f4944() {
  return "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
}

function rp_726566726573682e47454d494e495f415554485f555345525f4147454e54() {
  return "google-api-nodejs-client/10.9.0";
}

function rp_726566726573682e47454d494e495f4150495f434c49454e54() {
  return "gl-node/22.14.0";
}

function rp_726566726573682e434c415544455f434c49454e545f4944() {
  return "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
}

function rp_726566726573682e434c415544455f544f4b454e5f55524c() {
  return "https://platform.claude.com/v1/oauth/token";
}

function rp_726566726573682e524546524553485f534b45575f4d53() {
  return ml_fixed((5n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function rp_726566726573682e524f544154494f4e5f4154545249425554494f4e5f4d53() {
  return ml_fixed((60n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function rp_726566726573682e726566726573685f636f6e666967(provider) {
  ml_validate_rust_value(provider, {"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572"}, ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3, { refinements: ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 });
  switch (provider.$) {
    case "Claude": {
      const ml_record1 = rp_726566726573682e434c415544455f544f4b454e5f55524c();
      const ml_record2 = rp_726566726573682e434c415544455f434c49454e545f4944();
      const ml_record3 = Object.freeze({ $: 'Json' });
      return ml_snapshot_constructor_value(Object.freeze({ $: "RefreshConfig", ["token_url"]: ml_record1, ["client_id"]: ml_record2, ["style"]: ml_record3 }), {"kind":"data","name":"rp_726566726573682e52656672657368436f6e666967"}, ml_constructor_value_schema_9c3a44a92f23e59acc6ff518078611b977e04aa540dcce66edad2a7b242d9492);
    }
    case "Codex": {
      const ml_record4 = "https://auth.openai.com/oauth/token";
      const ml_record5 = "app_EMoamEEZ73f0CkXaXp7hrann";
      const ml_record6 = Object.freeze({ $: 'Json' });
      return ml_snapshot_constructor_value(Object.freeze({ $: "RefreshConfig", ["token_url"]: ml_record4, ["client_id"]: ml_record5, ["style"]: ml_record6 }), {"kind":"data","name":"rp_726566726573682e52656672657368436f6e666967"}, ml_constructor_value_schema_9c3a44a92f23e59acc6ff518078611b977e04aa540dcce66edad2a7b242d9492);
    }
    case "Gemini": {
      const ml_record7 = "https://oauth2.googleapis.com/token";
      const ml_record8 = rp_726566726573682e47454d494e495f434c49454e545f4944();
      const ml_record9 = Object.freeze({ $: 'Form' });
      return ml_snapshot_constructor_value(Object.freeze({ $: "RefreshConfig", ["token_url"]: ml_record7, ["client_id"]: ml_record8, ["style"]: ml_record9 }), {"kind":"data","name":"rp_726566726573682e52656672657368436f6e666967"}, ml_constructor_value_schema_9c3a44a92f23e59acc6ff518078611b977e04aa540dcce66edad2a7b242d9492);
    }
    case "Qwen": {
      const ml_record10 = "https://chat.qwen.ai/api/v1/oauth2/token";
      const ml_record11 = "f0304373b74a44d2b584a3fb70ca9e56";
      const ml_record12 = Object.freeze({ $: 'Form' });
      return ml_snapshot_constructor_value(Object.freeze({ $: "RefreshConfig", ["token_url"]: ml_record10, ["client_id"]: ml_record11, ["style"]: ml_record12 }), {"kind":"data","name":"rp_726566726573682e52656672657368436f6e666967"}, ml_constructor_value_schema_9c3a44a92f23e59acc6ff518078611b977e04aa540dcce66edad2a7b242d9492);
    }
    default: {
      return ml_router_unexpected(provider);
    }
  }
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
  if (typeof field0 !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(field0, 0n, 65535n, "u16 argument field0 out of range");
  if (!(typeof field0 === 'bigint' && field0 >= 0n && field0 <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(field1, {"kind":"data","name":"RefreshStatusClass"}, ml_constructor_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865);
  ml_validate_rust_value(field1, {"kind":"data","name":"RefreshStatusClass"}, ml_host_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865, { refinements: ml_host_value_refinements_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 });
  ml_assert_constructor_input(field2, {"kind":"data","name":"RouterOption_3_i64"}, ml_constructor_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40);
  ml_validate_rust_value(field2, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Status', field0: field0, field1: field1, field2: field2 }), {"kind":"data","name":"RefreshError"}, ml_constructor_value_schema_625cbd19bbf92116746225c08afbcbe7d10e648ca34045d483ea94f9f67701ba);
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
  ml_assert_constructor_input(kind, {"kind":"data","name":"ImportRefreshFailureKind"}, ml_constructor_value_schema_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501);
  ml_validate_rust_value(kind, {"kind":"data","name":"ImportRefreshFailureKind"}, ml_host_value_schema_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501, { refinements: ml_host_value_refinements_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "ImportRefreshFailure", ["kind"]: kind, ["message"]: message }), {"kind":"data","name":"ImportRefreshFailure"}, ml_constructor_value_schema_4e62c49d42904546bad75d34c442cd28f8aa320f3135ce64213aaebac70a5e9c);
}

function ml_make_CredentialEvidence_Working() {
  return Object.freeze({ $: 'Working' });
}

function ml_make_CredentialEvidence_Rejected() {
  return Object.freeze({ $: 'Rejected' });
}

export const translated = { ["BodyStyle"]: Object.freeze({ ["Json"]: ml_make_BodyStyle_Json, ["Form"]: ml_make_BodyStyle_Form }), ["RefreshConfig"]: ml_make_RefreshConfig_RefreshConfig, ["CLAUDE_OAUTH_USER_AGENT"]: rp_726566726573682e434c415544455f4f415554485f555345525f4147454e54(), ["ANTHROPIC_SDK_VERSION"]: rp_726566726573682e414e5448524f5049435f53444b5f56455253494f4e(), ["GEMINI_CLI_VERSION"]: rp_726566726573682e47454d494e495f434c495f56455253494f4e(), ["GOOGLE_AUTH_LIBRARY_VERSION"]: rp_726566726573682e474f4f474c455f415554485f4c4942524152595f56455253494f4e(), ["QWEN_CODE_VERSION"]: rp_726566726573682e5157454e5f434f44455f56455253494f4e(), ["GEMINI_CLIENT_ID_ENV"]: rp_726566726573682e47454d494e495f434c49454e545f49445f454e56(), ["GEMINI_CLIENT_SECRET_ENV"]: rp_726566726573682e47454d494e495f434c49454e545f5345435245545f454e56(), ["GEMINI_CLIENT_ID"]: rp_726566726573682e47454d494e495f434c49454e545f4944(), ["GEMINI_AUTH_USER_AGENT"]: rp_726566726573682e47454d494e495f415554485f555345525f4147454e54(), ["GEMINI_API_CLIENT"]: rp_726566726573682e47454d494e495f4150495f434c49454e54(), ["CLAUDE_CLIENT_ID"]: rp_726566726573682e434c415544455f434c49454e545f4944(), ["CLAUDE_TOKEN_URL"]: rp_726566726573682e434c415544455f544f4b454e5f55524c(), ["REFRESH_SKEW_MS"]: rp_726566726573682e524546524553485f534b45575f4d53(), ["ROTATION_ATTRIBUTION_MS"]: rp_726566726573682e524f544154494f4e5f4154545249425554494f4e5f4d53(), ["refresh_config"]: rp_726566726573682e726566726573685f636f6e666967, ["RefreshError"]: Object.freeze({ ["Unsupported"]: ml_make_RefreshError_Unsupported, ["NoRefreshToken"]: ml_make_RefreshError_NoRefreshToken, ["Request"]: ml_make_RefreshError_Request, ["Status"]: ml_make_RefreshError_Status, ["Parse"]: ml_make_RefreshError_Parse, ["Storage"]: ml_make_RefreshError_Storage }), ["RefreshStatusClass"]: Object.freeze({ ["InvalidGrant"]: ml_make_RefreshStatusClass_InvalidGrant, ["InvalidClient"]: ml_make_RefreshStatusClass_InvalidClient, ["UnauthorizedClient"]: ml_make_RefreshStatusClass_UnauthorizedClient, ["UnsupportedGrantType"]: ml_make_RefreshStatusClass_UnsupportedGrantType, ["RateLimited"]: ml_make_RefreshStatusClass_RateLimited, ["ClientRejected"]: ml_make_RefreshStatusClass_ClientRejected, ["Transient"]: ml_make_RefreshStatusClass_Transient, ["UnexpectedStatus"]: ml_make_RefreshStatusClass_UnexpectedStatus }), ["ImportRefreshFailureKind"]: Object.freeze({ ["NotAttempted"]: ml_make_ImportRefreshFailureKind_NotAttempted, ["ExchangeRejected"]: ml_make_ImportRefreshFailureKind_ExchangeRejected, ["ExchangeUncertain"]: ml_make_ImportRefreshFailureKind_ExchangeUncertain, ["PersistenceUncertain"]: ml_make_ImportRefreshFailureKind_PersistenceUncertain }), ["ImportRefreshFailure"]: ml_make_ImportRefreshFailure_ImportRefreshFailure, ["CredentialEvidence"]: Object.freeze({ ["Working"]: ml_make_CredentialEvidence_Working, ["Rejected"]: ml_make_CredentialEvidence_Rejected }) };
export const provenance = {"sourcePath":"rust/src/refresh.rs","sourceSha256":"dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108","executable":22,"executableFunctions":1,"executableConstants":14,"executableTypes":7,"executableConstructors":24,"carried":44,"preserved":67,"runtimeParity":false};
