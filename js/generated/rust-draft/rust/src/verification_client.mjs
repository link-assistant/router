// Generated draft from rust/src/verification_client.rs; sha256=e3c18cb1b634ee38f21b00d84edd7af4262625589bc38b31695316375f228374
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
export const provenance = {"sourcePath":"rust/src/verification_client.rs","sourceSha256":"e3c18cb1b634ee38f21b00d84edd7af4262625589bc38b31695316375f228374","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":13,"runtimeParity":false};
