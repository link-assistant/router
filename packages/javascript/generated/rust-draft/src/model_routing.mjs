// Generated draft from src/model_routing.rs; sha256=e5a7479d421e89d650c22682fc7ff8b0b32067cd7af9dc5fc7b421a02bf39e3f
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = {"schemaVersion":1,"types":{"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572","ctors":[{"name":"Claude","fields":[]},{"name":"Codex","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

const ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = new Map([]);

function rp_6d6f64656c5f726f7574696e672e70726f76696465725f6f776e6572(provider) {
  ml_validate_rust_value(provider, {"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572"}, ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3, { refinements: ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 });
  switch (provider.$) {
    case "Claude": {
      return "anthropic";
    }
    case "Codex": {
      return "openai";
    }
    case "Gemini": {
      return "google";
    }
    case "Qwen": {
      return "qwen";
    }
    default: {
      return ml_router_unexpected(provider);
    }
  }
}

function ml_make_ProviderHealthState_Starting() {
  return Object.freeze({ $: 'Starting' });
}

function ml_make_ProviderHealthState_Healthy() {
  return Object.freeze({ $: 'Healthy' });
}

function ml_make_ProviderHealthState_Degraded() {
  return Object.freeze({ $: 'Degraded' });
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

export const translated = { ["provider_owner"]: rp_6d6f64656c5f726f7574696e672e70726f76696465725f6f776e6572, ["ProviderHealthState"]: Object.freeze({ ["Starting"]: ml_make_ProviderHealthState_Starting, ["Healthy"]: ml_make_ProviderHealthState_Healthy, ["Degraded"]: ml_make_ProviderHealthState_Degraded }) };
export const provenance = {"sourcePath":"src/model_routing.rs","sourceSha256":"e5a7479d421e89d650c22682fc7ff8b0b32067cd7af9dc5fc7b421a02bf39e3f","executable":2,"executableFunctions":1,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":71,"preserved":74,"runtimeParity":false};
