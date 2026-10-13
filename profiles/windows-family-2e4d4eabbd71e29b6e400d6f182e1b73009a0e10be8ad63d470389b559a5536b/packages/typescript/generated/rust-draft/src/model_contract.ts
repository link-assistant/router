
// Generated draft from src/model_contract.rs; sha256=98bcf7cc0d91d5b0a4f2b30f6f79aebf6d8e761e9cb54372cd135379e5c3e11b
// Carried constructs are data, never runtime parity evidence.
function rp_6d6f64656c5f636f6e74726163742e69735f66616c7365(value: boolean): boolean {
  if (!(typeof value === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return !value;
}

export const translated: { "is_false": (value: boolean) => boolean } = { ["is_false"]: rp_6d6f64656c5f636f6e74726163742e69735f66616c7365 };
export const provenance = {"sourcePath":"src/model_contract.rs","sourceSha256":"98bcf7cc0d91d5b0a4f2b30f6f79aebf6d8e761e9cb54372cd135379e5c3e11b","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":21,"preserved":23,"runtimeParity":false};
