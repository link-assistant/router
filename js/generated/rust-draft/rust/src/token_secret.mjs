// Generated draft from rust/src/token_secret.rs; sha256=7ffdf979e0a1bbe7ebf694cc44e963429f7c2f28911e3eb7a6a86d924644b862
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function rp_746f6b656e5f7365637265742e53454e54494e454c() {
  return "\u0000link-assistant-router:no-token-secret:";
}

function rp_746f6b656e5f7365637265742e4c45474143595f504c414345484f4c44455253() {
  return ml_copy_fixed_array(["unused-by-remote-command", "unused-by-auth", "unused-by-this-client-command"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

function rp_746f6b656e5f7365637265742e706c616365686f6c646572(reason) {
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_fmt_1 = rp_746f6b656e5f7365637265742e53454e54494e454c();
    const ml_fmt_2 = reason;
    return (ml_fmt_1 + ml_fmt_2);
  })();
}

function rp_746f6b656e5f7365637265742e7265667573616c() {
  return (() => {
    const ml_fmt_1 = "TOKEN_SECRET environment variable is required: this command signs or encrypts on this machine, and no signing secret was supplied";
    return ml_fmt_1;
  })();
}

function rp_746f6b656e5f7365637265742e46494c455f454e56() {
  return "TOKEN_SECRET_FILE";
}

export const translated = { ["SENTINEL"]: rp_746f6b656e5f7365637265742e53454e54494e454c(), ["LEGACY_PLACEHOLDERS"]: rp_746f6b656e5f7365637265742e4c45474143595f504c414345484f4c44455253(), ["placeholder"]: rp_746f6b656e5f7365637265742e706c616365686f6c646572, ["refusal"]: rp_746f6b656e5f7365637265742e7265667573616c, ["FILE_ENV"]: rp_746f6b656e5f7365637265742e46494c455f454e56() };
export const provenance = {"sourcePath":"rust/src/token_secret.rs","sourceSha256":"7ffdf979e0a1bbe7ebf694cc44e963429f7c2f28911e3eb7a6a86d924644b862","executable":5,"executableFunctions":2,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":11,"runtimeParity":false};
