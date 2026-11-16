// Generated draft from rust/src/token_report.rs; sha256=0e49a5ad5428c737697312b6a17d67d1a080c281194b2962bf24ccc897e8433e
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function rp_746f6b656e5f7265706f72742e48454144455253() {
  return ml_copy_fixed_array(["id", "issued_at", "expires_at", "revoked", "requests", "tokens", "reserved", "rpm", "scope"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":9}});
}

export const translated = { ["HEADERS"]: rp_746f6b656e5f7265706f72742e48454144455253() };
export const provenance = {"sourcePath":"rust/src/token_report.rs","sourceSha256":"0e49a5ad5428c737697312b6a17d67d1a080c281194b2962bf24ccc897e8433e","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":4,"preserved":6,"runtimeParity":false};
