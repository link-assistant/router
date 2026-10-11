// Generated draft from src/capabilities.rs; sha256=7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d = {"schemaVersion":1,"types":{"Capability":{"kind":"data","name":"Capability","ctors":[{"name":"Native","fields":[]},{"name":"Emulated","fields":[]},{"name":"Unsupported","fields":[]},{"name":"Unknown","fields":[]}]}}};

const ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d = new Map([]);

function ml_make_Capability_Native() {
  return Object.freeze({ $: 'Native' });
}

function ml_make_Capability_Emulated() {
  return Object.freeze({ $: 'Emulated' });
}

function ml_make_Capability_Unsupported() {
  return Object.freeze({ $: 'Unsupported' });
}

function ml_make_Capability_Unknown() {
  return Object.freeze({ $: 'Unknown' });
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

function ml_make_ProviderCapabilities_ProviderCapabilities(temperature, top_p, stop_sequences, output_token_limit, reasoning, web_search, web_fetch) {
  ml_validate_rust_value(temperature, {"kind":"data","name":"Capability"}, ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d, { refinements: ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d });
  ml_validate_rust_value(top_p, {"kind":"data","name":"Capability"}, ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d, { refinements: ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d });
  ml_validate_rust_value(stop_sequences, {"kind":"data","name":"Capability"}, ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d, { refinements: ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d });
  ml_validate_rust_value(output_token_limit, {"kind":"data","name":"Capability"}, ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d, { refinements: ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d });
  ml_validate_rust_value(reasoning, {"kind":"data","name":"Capability"}, ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d, { refinements: ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d });
  ml_validate_rust_value(web_search, {"kind":"data","name":"Capability"}, ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d, { refinements: ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d });
  ml_validate_rust_value(web_fetch, {"kind":"data","name":"Capability"}, ml_host_value_schema_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d, { refinements: ml_host_value_refinements_e61df5393e354e433e7bfd5429177c099f0df7b9215d75bc21e321ac59654b7d });
  return Object.freeze({ $: "ProviderCapabilities", ["temperature"]: temperature, ["top_p"]: top_p, ["stop_sequences"]: stop_sequences, ["output_token_limit"]: output_token_limit, ["reasoning"]: reasoning, ["web_search"]: web_search, ["web_fetch"]: web_fetch });
}

export const translated = { ["Capability"]: Object.freeze({ ["Native"]: ml_make_Capability_Native, ["Emulated"]: ml_make_Capability_Emulated, ["Unsupported"]: ml_make_Capability_Unsupported, ["Unknown"]: ml_make_Capability_Unknown }), ["ProviderCapabilities"]: ml_make_ProviderCapabilities_ProviderCapabilities };
export const provenance = {"sourcePath":"src/capabilities.rs","sourceSha256":"7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":5,"carried":13,"preserved":16,"runtimeParity":false};
