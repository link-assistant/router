
// Generated draft from rust/src/token_secret.rs; sha256=46fa488942382a537ee80c3e3d68d5ed8b4e25789879f0e6ef6d9337f7fc8b5d
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function rp_746f6b656e5f7365637265742e53454e54494e454c(): string {
  return "\u0000link-assistant-router:no-token-secret:";
}

function rp_746f6b656e5f7365637265742e4c45474143595f504c414345484f4c44455253(): ReadonlyArray<string> & { readonly length: 3 } {
  return ml_copy_fixed_array(["unused-by-remote-command", "unused-by-auth", "unused-by-this-client-command"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

function rp_746f6b656e5f7365637265742e7265667573616c(): string {
  return (() => {
    const ml_fmt_1 = "TOKEN_SECRET environment variable is required: this command signs or encrypts on this machine, and no signing secret was supplied";
    return ml_fmt_1;
  })();
}

function rp_746f6b656e5f7365637265742e46494c455f454e56(): string {
  return "TOKEN_SECRET_FILE";
}

export const translated: { "SENTINEL": string; "LEGACY_PLACEHOLDERS": ReadonlyArray<string> & { readonly length: 3 }; "refusal": () => string; "FILE_ENV": string } = { ["SENTINEL"]: rp_746f6b656e5f7365637265742e53454e54494e454c(), ["LEGACY_PLACEHOLDERS"]: rp_746f6b656e5f7365637265742e4c45474143595f504c414345484f4c44455253(), ["refusal"]: rp_746f6b656e5f7365637265742e7265667573616c, ["FILE_ENV"]: rp_746f6b656e5f7365637265742e46494c455f454e56() };
export const provenance = {"sourcePath":"rust/src/token_secret.rs","sourceSha256":"46fa488942382a537ee80c3e3d68d5ed8b4e25789879f0e6ef6d9337f7fc8b5d","executable":4,"executableFunctions":1,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":6,"preserved":11,"runtimeParity":false};
