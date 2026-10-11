// Generated draft from src/zai_coding_plan.rs; sha256=47c521e6806fa8d543d939fd6b1751fb48b180874322cf0699957c9c85b79aa2
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_21817407e4f47441c513d31711f328cdd8009c5f0784ba37782d9a1e4c37c288 = {"schemaVersion":1,"types":{"ZaiProbeFailureKind":{"kind":"data","name":"ZaiProbeFailureKind","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unverified","fields":[]}]}}};

const ml_host_value_refinements_21817407e4f47441c513d31711f328cdd8009c5f0784ba37782d9a1e4c37c288 = new Map([]);

function rp_7a61695f636f64696e675f706c616e2e414e5448524f5049435f424153455f50415448() {
  return "/api/anthropic";
}

function rp_7a61695f636f64696e675f706c616e2e434841545f424153455f50415448() {
  return "/api/coding/paas/v4";
}

function rp_7a61695f636f64696e675f706c616e2e524553504f4e5345535f424153455f50415448() {
  return "/api/v1";
}

function rp_7a61695f636f64696e675f706c616e2e4845414c54485f50415448() {
  return "/api/monitor/usage/quota/limit";
}

function rp_7a61695f636f64696e675f706c616e2e434154414c4f475f50415448() {
  return "/api/anthropic/v1/models";
}

function rp_7a61695f636f64696e675f706c616e2e434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_7a61695f636f64696e675f706c616e2e4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_7a61695f636f64696e675f706c616e2e4d41585f434154414c4f475f424f4459() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_ZaiProbeFailureKind_CredentialRejected() {
  return Object.freeze({ $: 'CredentialRejected' });
}

function ml_make_ZaiProbeFailureKind_RateLimited() {
  return Object.freeze({ $: 'RateLimited' });
}

function ml_make_ZaiProbeFailureKind_Unverified() {
  return Object.freeze({ $: 'Unverified' });
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

function ml_make_ZaiProbeFailure_ZaiProbeFailure(kind, message) {
  ml_validate_rust_value(kind, {"kind":"data","name":"ZaiProbeFailureKind"}, ml_host_value_schema_21817407e4f47441c513d31711f328cdd8009c5f0784ba37782d9a1e4c37c288, { refinements: ml_host_value_refinements_21817407e4f47441c513d31711f328cdd8009c5f0784ba37782d9a1e4c37c288 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ZaiProbeFailure", ["kind"]: kind, ["message"]: message });
}

export const translated = { ["ANTHROPIC_BASE_PATH"]: rp_7a61695f636f64696e675f706c616e2e414e5448524f5049435f424153455f50415448(), ["CHAT_BASE_PATH"]: rp_7a61695f636f64696e675f706c616e2e434841545f424153455f50415448(), ["RESPONSES_BASE_PATH"]: rp_7a61695f636f64696e675f706c616e2e524553504f4e5345535f424153455f50415448(), ["HEALTH_PATH"]: rp_7a61695f636f64696e675f706c616e2e4845414c54485f50415448(), ["CATALOG_PATH"]: rp_7a61695f636f64696e675f706c616e2e434154414c4f475f50415448(), ["CATALOG_TTL"]: rp_7a61695f636f64696e675f706c616e2e434154414c4f475f54544c(), ["FAILED_REFRESH_RETRY"]: rp_7a61695f636f64696e675f706c616e2e4641494c45445f524546524553485f5245545259(), ["MAX_CATALOG_BODY"]: rp_7a61695f636f64696e675f706c616e2e4d41585f434154414c4f475f424f4459(), ["ZaiProbeFailureKind"]: Object.freeze({ ["CredentialRejected"]: ml_make_ZaiProbeFailureKind_CredentialRejected, ["RateLimited"]: ml_make_ZaiProbeFailureKind_RateLimited, ["Unverified"]: ml_make_ZaiProbeFailureKind_Unverified }), ["ZaiProbeFailure"]: ml_make_ZaiProbeFailure_ZaiProbeFailure };
export const provenance = {"sourcePath":"src/zai_coding_plan.rs","sourceSha256":"47c521e6806fa8d543d939fd6b1751fb48b180874322cf0699957c9c85b79aa2","executable":10,"executableFunctions":0,"executableConstants":8,"executableTypes":2,"executableConstructors":4,"carried":38,"preserved":49,"runtimeParity":false};
