// Generated draft from src/security_headers.rs; sha256=b326e0dfa436e9ed06803f2c710cee6431d7743ba7fa285081ea5206c2f4ec3e
// Carried constructs are data, never runtime parity evidence.
function CONTENT_SECURITY_POLICY() {
  return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
}

export const translated = { "CONTENT_SECURITY_POLICY": CONTENT_SECURITY_POLICY() };
export const provenance = {"sourcePath":"src/security_headers.rs","sourceSha256":"b326e0dfa436e9ed06803f2c710cee6431d7743ba7fa285081ea5206c2f4ec3e","executable":1,"executableFunctions":0,"executableConstants":1,"carried":7,"preserved":9,"runtimeParity":false};
