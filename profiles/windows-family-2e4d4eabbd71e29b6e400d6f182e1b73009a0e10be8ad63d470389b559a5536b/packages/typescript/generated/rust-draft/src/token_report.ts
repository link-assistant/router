
// Generated draft from src/token_report.rs; sha256=a1b0d18d05ce144cd68124fc0dc423cef5bf474e3e086999b8e125360579a6c6
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function rp_746f6b656e5f7265706f72742e48454144455253(): ReadonlyArray<string> & { readonly length: 9 } {
  return ml_copy_fixed_array(["id", "issued_at", "expires_at", "revoked", "requests", "tokens", "reserved", "rpm", "scope"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":9}});
}

export const translated: { "HEADERS": ReadonlyArray<string> & { readonly length: 9 } } = { ["HEADERS"]: rp_746f6b656e5f7265706f72742e48454144455253() };
export const provenance = {"sourcePath":"src/token_report.rs","sourceSha256":"a1b0d18d05ce144cd68124fc0dc423cef5bf474e3e086999b8e125360579a6c6","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":4,"preserved":6,"runtimeParity":false};
