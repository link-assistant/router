// Generated draft from src/subscription_usage.rs; sha256=d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

const ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = {"schemaVersion":1,"types":{"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]}}};

const ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = new Map([["serde_json.Number", ml_validate_json_number], ["serde_json.Map_String_Value", ml_validate_json_map]]);

const ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = new Map([]);

function rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e() {
  return 1n;
}

function rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459() {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_SafeCredentialMetadata_SafeCredentialMetadata(plan, subscription_end) {
  ml_validate_rust_value(plan, {"kind":"data","name":"RouterOption_6_string","patternOwnershipRefusal":"ownership-bearing String type"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(subscription_end, {"kind":"data","name":"RouterOption_6_string","patternOwnershipRefusal":"ownership-bearing String type"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: "SafeCredentialMetadata", ["plan"]: plan, ["subscription_end"]: subscription_end });
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

function ml_make_VendorResponse_Json(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"serde_json.Value"}, ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5, { refinements: ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 });
  return Object.freeze({ $: 'Json', field0: field0 });
}

function ml_make_VendorResponse_AuthenticationRejected() {
  return Object.freeze({ $: 'AuthenticationRejected' });
}

function ml_make_VendorResponse_RateLimited(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  return Object.freeze({ $: 'RateLimited', field0: field0 });
}

function ml_make_VendorResponse_Malformed() {
  return Object.freeze({ $: 'Malformed' });
}

function ml_make_VendorResponse_Unavailable() {
  return Object.freeze({ $: 'Unavailable' });
}

function ml_make_BoundedBodyError_TooLarge() {
  return Object.freeze({ $: 'TooLarge' });
}

function ml_make_BoundedBodyError_Read() {
  return Object.freeze({ $: 'Read' });
}

export const translated = { ["SCHEMA_VERSION"]: rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e(), ["MAX_USAGE_BODY"]: rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459(), ["SafeCredentialMetadata"]: ml_make_SafeCredentialMetadata_SafeCredentialMetadata, ["VendorResponse"]: Object.freeze({ ["Json"]: ml_make_VendorResponse_Json, ["AuthenticationRejected"]: ml_make_VendorResponse_AuthenticationRejected, ["RateLimited"]: ml_make_VendorResponse_RateLimited, ["Malformed"]: ml_make_VendorResponse_Malformed, ["Unavailable"]: ml_make_VendorResponse_Unavailable }), ["BoundedBodyError"]: Object.freeze({ ["TooLarge"]: ml_make_BoundedBodyError_TooLarge, ["Read"]: ml_make_BoundedBodyError_Read }) };
export const provenance = {"sourcePath":"src/subscription_usage.rs","sourceSha256":"d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9","executable":5,"executableFunctions":0,"executableConstants":2,"executableTypes":3,"executableConstructors":8,"carried":53,"preserved":58,"runtimeParity":false};
