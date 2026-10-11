// Generated draft from src/request_log.rs; sha256=659faec12e15116eb27b0c65037bb86dda6a3e64fefa87266313fee23eaf2e4d
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

const ml_host_value_schema_b22fe8d3aa61d14a807209947c20d108d10fc06f175a5d0b339422444136180d = {"schemaVersion":1,"types":{"LogIdentity":{"kind":"data","name":"LogIdentity","ctors":[{"name":"LogIdentity","fields":[{"name":"hash","type":{"kind":"string"}},{"name":"id","type":{"kind":"data","name":"RouterOption_6_string"}},{"name":"label","type":{"kind":"data","name":"RouterOption_6_string"}}]}]},"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_b22fe8d3aa61d14a807209947c20d108d10fc06f175a5d0b339422444136180d = new Map([]);

function LOG_FILE() {
  return "requests.lino";
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

function LEGACY_LOG_FILE() {
  return "requests.jsonl";
}

function DEFAULT_MAX_BYTES() {
  return ml_fixed((ml_fixed((100n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function DEFAULT_MAX_TOTAL_BYTES() {
  return ml_fixed((ml_fixed((ml_fixed((4n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_BUFFERED_REQUEST_BYTES() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_EAGER_REQUEST_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function REDACTED() {
  return "[REDACTED]";
}

function UNAUTHENTICATED() {
  return "unauthenticated";
}

function TOKEN_HASH_HEX_LENGTH() {
  return 32n;
}

function REDACTED_PREFIX_LENGTH() {
  return 3n;
}

function REDACTED_SUFFIX_LENGTH() {
  return 3n;
}

function MIN_PARTIAL_REDACTION_LENGTH() {
  return 12n;
}

function ml_make_LogIdentity_LogIdentity(hash, id, label) {
  if (!(typeof hash === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(hash))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(id, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(label, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: "LogIdentity", ["hash"]: hash, ["id"]: id, ["label"]: label });
}

function ml_make_LogRoute_LogRoute(identity, account) {
  ml_validate_rust_value(identity, {"kind":"data","name":"LogIdentity"}, ml_host_value_schema_b22fe8d3aa61d14a807209947c20d108d10fc06f175a5d0b339422444136180d, { refinements: ml_host_value_refinements_b22fe8d3aa61d14a807209947c20d108d10fc06f175a5d0b339422444136180d });
  ml_validate_rust_value(account, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: "LogRoute", ["identity"]: identity, ["account"]: account });
}

function ml_make_RequestCorrelationId_RequestCorrelationId(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "RequestCorrelationId", ["field0"]: field0 });
}

export const translated = { ["LOG_FILE"]: LOG_FILE(), ["LEGACY_LOG_FILE"]: LEGACY_LOG_FILE(), ["DEFAULT_MAX_BYTES"]: DEFAULT_MAX_BYTES(), ["DEFAULT_MAX_TOTAL_BYTES"]: DEFAULT_MAX_TOTAL_BYTES(), ["MAX_BUFFERED_REQUEST_BYTES"]: MAX_BUFFERED_REQUEST_BYTES(), ["MAX_EAGER_REQUEST_BYTES"]: MAX_EAGER_REQUEST_BYTES(), ["REDACTED"]: REDACTED(), ["UNAUTHENTICATED"]: UNAUTHENTICATED(), ["TOKEN_HASH_HEX_LENGTH"]: TOKEN_HASH_HEX_LENGTH(), ["REDACTED_PREFIX_LENGTH"]: REDACTED_PREFIX_LENGTH(), ["REDACTED_SUFFIX_LENGTH"]: REDACTED_SUFFIX_LENGTH(), ["MIN_PARTIAL_REDACTION_LENGTH"]: MIN_PARTIAL_REDACTION_LENGTH(), ["LogIdentity"]: ml_make_LogIdentity_LogIdentity, ["LogRoute"]: ml_make_LogRoute_LogRoute, ["RequestCorrelationId"]: ml_make_RequestCorrelationId_RequestCorrelationId };
export const provenance = {"sourcePath":"src/request_log.rs","sourceSha256":"659faec12e15116eb27b0c65037bb86dda6a3e64fefa87266313fee23eaf2e4d","executable":15,"executableFunctions":0,"executableConstants":12,"executableTypes":3,"executableConstructors":3,"carried":48,"preserved":64,"runtimeParity":false};
