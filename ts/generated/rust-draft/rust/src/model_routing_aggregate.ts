
// Generated draft from rust/src/model_routing_aggregate.rs; sha256=604c585ebb13e6430fbe4a70e6ae084ed9ddb16a4f322d15ab548709987a5980
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function rp_6d6f64656c5f726f7574696e672e6167677265676174652e4341504142494c4954595f4649454c4453(): ReadonlyArray<string> & { readonly length: 9 } {
  return ml_copy_fixed_array(["context_window", "max_output_tokens", "modalities", "pricing", "deprecation_date", "default_reasoning_level", "supported_reasoning_levels", "client_capabilities", "thinking"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":9}});
}

export const translated: { "CAPABILITY_FIELDS": ReadonlyArray<string> & { readonly length: 9 } } = { ["CAPABILITY_FIELDS"]: rp_6d6f64656c5f726f7574696e672e6167677265676174652e4341504142494c4954595f4649454c4453() };
export const provenance = {"sourcePath":"rust/src/model_routing_aggregate.rs","sourceSha256":"604c585ebb13e6430fbe4a70e6ae084ed9ddb16a4f322d15ab548709987a5980","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":16,"preserved":18,"runtimeParity":false};
