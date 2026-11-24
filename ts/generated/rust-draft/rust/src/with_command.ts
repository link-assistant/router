
// Generated draft from rust/src/with_command.rs; sha256=d4e0026b3a9d54b2073e6b64eb633fce1af8c74bdf12d170831ccdec242623cb
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function rp_776974685f636f6d6d616e642e434c415544455f505249564143595f44454641554c545f454e56(): ReadonlyArray<string> & { readonly length: 3 } {
  return ml_copy_fixed_array(["DISABLE_ERROR_REPORTING", "DISABLE_AUTOUPDATER", "DISABLE_FEEDBACK_COMMAND"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

function rp_776974685f636f6d6d616e642e434c415544455f464541545552455f464c41475f424c4f434b494e475f454e56(): ReadonlyArray<string> & { readonly length: 3 } {
  return ml_copy_fixed_array(["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "DISABLE_TELEMETRY", "DO_NOT_TRACK"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

export const translated: { "CLAUDE_PRIVACY_DEFAULT_ENV": ReadonlyArray<string> & { readonly length: 3 }; "CLAUDE_FEATURE_FLAG_BLOCKING_ENV": ReadonlyArray<string> & { readonly length: 3 } } = { ["CLAUDE_PRIVACY_DEFAULT_ENV"]: rp_776974685f636f6d6d616e642e434c415544455f505249564143595f44454641554c545f454e56(), ["CLAUDE_FEATURE_FLAG_BLOCKING_ENV"]: rp_776974685f636f6d6d616e642e434c415544455f464541545552455f464c41475f424c4f434b494e475f454e56() };
export const provenance = {"sourcePath":"rust/src/with_command.rs","sourceSha256":"d4e0026b3a9d54b2073e6b64eb633fce1af8c74bdf12d170831ccdec242623cb","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":45,"preserved":48,"runtimeParity":false};
