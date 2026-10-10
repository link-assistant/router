// Generated draft from src/token_secret.rs; sha256=a158416f1f1bd591e909a43ea5ee6dc1fcd5bebdf864e3e0b8684a453e1d5aae
// Carried constructs are data, never runtime parity evidence.
function SENTINEL() {
  return "\u0000link-assistant-router:no-token-secret:";
}

function placeholder(reason) {
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  return (SENTINEL() + reason);
}

function refusal() {
  return "TOKEN_SECRET environment variable is required: this command signs or encrypts on this machine, and no signing secret was supplied";
}

function FILE_ENV() {
  return "TOKEN_SECRET_FILE";
}

export const translated = { "SENTINEL": SENTINEL(), placeholder, refusal, "FILE_ENV": FILE_ENV() };
export const provenance = {"sourcePath":"src/token_secret.rs","sourceSha256":"a158416f1f1bd591e909a43ea5ee6dc1fcd5bebdf864e3e0b8684a453e1d5aae","executable":4,"executableFunctions":2,"executableConstants":2,"carried":6,"preserved":11,"runtimeParity":false};
