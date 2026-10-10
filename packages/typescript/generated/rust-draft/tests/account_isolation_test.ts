// Generated draft from tests/account_isolation_test.rs; sha256=e9035c81609b9afe81ea3c11882a1290a784067f73170ef448123f5dff2611e8
// Carried constructs are data, never runtime parity evidence.
function proxied_answer(_head: string) {
  return "HTTP/1.1 200 OK\r\ncontent-length: 7\r\n\r\nproxied";
}

function refuse_tunnel(_head: string) {
  return "HTTP/1.1 403 Forbidden\r\ncontent-length: 0\r\n\r\n";
}

export const translated: { "proxied_answer": (_head: string) => string; "refuse_tunnel": (_head: string) => string } = { proxied_answer, refuse_tunnel };
export const provenance = {"sourcePath":"tests/account_isolation_test.rs","sourceSha256":"e9035c81609b9afe81ea3c11882a1290a784067f73170ef448123f5dff2611e8","executable":2,"carried":19,"preserved":22,"runtimeParity":false};
