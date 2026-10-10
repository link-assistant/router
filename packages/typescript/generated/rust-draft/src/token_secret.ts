// Generated draft from src/token_secret.rs; sha256=a158416f1f1bd591e909a43ea5ee6dc1fcd5bebdf864e3e0b8684a453e1d5aae
// Carried constructs are data, never runtime parity evidence.
function SENTINEL() {
  return "\u0000link-assistant-router:no-token-secret:";
}

function placeholder(reason: string) {
  return (SENTINEL() + reason);
}

function FILE_ENV() {
  return "TOKEN_SECRET_FILE";
}

export const translated: { "SENTINEL": string; "placeholder": (reason: string) => string; "FILE_ENV": string } = { "SENTINEL": SENTINEL(), placeholder, "FILE_ENV": FILE_ENV() };
export const provenance = {"sourcePath":"src/token_secret.rs","sourceSha256":"a158416f1f1bd591e909a43ea5ee6dc1fcd5bebdf864e3e0b8684a453e1d5aae","executable":3,"carried":7,"preserved":11,"runtimeParity":false};
