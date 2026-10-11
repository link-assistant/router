// Generated draft from src/verification_client.rs; sha256=5372f4f479b43128d298a7a09baaf104993da28d54981d6fa620ba9541a63c45
// Carried constructs are data, never runtime parity evidence.
function rp_766572696669636174696f6e5f636c69656e742e7361666574795f666f72(os) {
  if (!(typeof os === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(os))) throw new TypeError('argument outside supported Rust value domain');
  if ((os === "macos")) {
    return Object.freeze({ $: 'Err', field0: "safe OS credential-store boundary unavailable: native macOS vendor probes are refused before version, doctor or TUI; use the disposable Linux verification environment" });
  } else {
    return Object.freeze({ $: 'Ok', field0: null });
  }
}

function rp_766572696669636174696f6e5f636c69656e742e434c49454e5453() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Tuple', field0: "claude", field1: "ROUTER_REAL_CLIENT_CLAUDE_VERSION" }), Object.freeze({ $: 'Tuple', field0: "codex", field1: "ROUTER_REAL_CLIENT_CODEX_VERSION" }), Object.freeze({ $: 'Tuple', field0: "opencode", field1: "ROUTER_REAL_CLIENT_OPENCODE_VERSION" })]));
}

export const translated = { ["safety_for"]: rp_766572696669636174696f6e5f636c69656e742e7361666574795f666f72, ["CLIENTS"]: rp_766572696669636174696f6e5f636c69656e742e434c49454e5453() };
export const provenance = {"sourcePath":"src/verification_client.rs","sourceSha256":"5372f4f479b43128d298a7a09baaf104993da28d54981d6fa620ba9541a63c45","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":13,"runtimeParity":false};
