// Generated draft from tests/real_clients/claude_selector.rs; sha256=872b722e55e136f7a7ba10940fe520817d71a57d65ba899fce4e4ade9a1b54b3
// Carried constructs are data, never runtime parity evidence.
function has_verified_profile(id) {
  if (!(typeof id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(id))) throw new TypeError('argument outside supported Rust value domain');
  return id.startsWith("future-glm");
}

export const translated = { has_verified_profile };
export const provenance = {"sourcePath":"tests/real_clients/claude_selector.rs","sourceSha256":"872b722e55e136f7a7ba10940fe520817d71a57d65ba899fce4e4ade9a1b54b3","executable":1,"executableFunctions":1,"executableConstants":0,"carried":15,"preserved":16,"runtimeParity":false};
