
// Generated draft from src/token_secret.rs; sha256=a158416f1f1bd591e909a43ea5ee6dc1fcd5bebdf864e3e0b8684a453e1d5aae
// Carried constructs are data, never runtime parity evidence.
function rp_746f6b656e5f7365637265742e53454e54494e454c(): string {
  return "\u0000link-assistant-router:no-token-secret:";
}

function rp_746f6b656e5f7365637265742e7265667573616c(): string {
  return "TOKEN_SECRET environment variable is required: this command signs or encrypts on this machine, and no signing secret was supplied";
}

function rp_746f6b656e5f7365637265742e46494c455f454e56(): string {
  return "TOKEN_SECRET_FILE";
}

export const translated: { "SENTINEL": string; "refusal": () => string; "FILE_ENV": string } = { ["SENTINEL"]: rp_746f6b656e5f7365637265742e53454e54494e454c(), ["refusal"]: rp_746f6b656e5f7365637265742e7265667573616c, ["FILE_ENV"]: rp_746f6b656e5f7365637265742e46494c455f454e56() };
export const provenance = {"sourcePath":"src/token_secret.rs","sourceSha256":"a158416f1f1bd591e909a43ea5ee6dc1fcd5bebdf864e3e0b8684a453e1d5aae","executable":3,"executableFunctions":1,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":11,"runtimeParity":false};
