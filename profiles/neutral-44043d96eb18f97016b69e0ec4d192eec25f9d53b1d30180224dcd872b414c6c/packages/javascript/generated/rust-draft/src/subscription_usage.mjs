// Generated draft from src/subscription_usage.rs; sha256=d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e() {
  return 1n;
}

function rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459() {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_SafeCredentialMetadata_SafeCredentialMetadata(plan, subscription_end) {
  ml_validate_rust_value(plan, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(subscription_end, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
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

function ml_make_BoundedBodyError_TooLarge() {
  return Object.freeze({ $: 'TooLarge' });
}

function ml_make_BoundedBodyError_Read() {
  return Object.freeze({ $: 'Read' });
}

export const translated = { ["SCHEMA_VERSION"]: rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e(), ["MAX_USAGE_BODY"]: rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459(), ["SafeCredentialMetadata"]: ml_make_SafeCredentialMetadata_SafeCredentialMetadata, ["BoundedBodyError"]: Object.freeze({ ["TooLarge"]: ml_make_BoundedBodyError_TooLarge, ["Read"]: ml_make_BoundedBodyError_Read }) };
export const provenance = {"sourcePath":"src/subscription_usage.rs","sourceSha256":"d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":3,"carried":54,"preserved":58,"runtimeParity":false};
