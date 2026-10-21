
// Generated draft from rust/src/security_headers.rs; sha256=ed043f4bcda1ca3ea90c796810bd5b83ff35b1f8567544535c2258987b0fb8ce
// Carried constructs are data, never runtime parity evidence.
function rp_73656375726974795f686561646572732e434f4e54454e545f53454355524954595f504f4c494359(): string {
  return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
}

export const translated: { "CONTENT_SECURITY_POLICY": string } = { ["CONTENT_SECURITY_POLICY"]: rp_73656375726974795f686561646572732e434f4e54454e545f53454355524954595f504f4c494359() };
export const provenance = {"sourcePath":"rust/src/security_headers.rs","sourceSha256":"ed043f4bcda1ca3ea90c796810bd5b83ff35b1f8567544535c2258987b0fb8ce","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":9,"runtimeParity":false};
