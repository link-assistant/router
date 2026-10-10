// Generated draft from src/verification_client.rs; sha256=5372f4f479b43128d298a7a09baaf104993da28d54981d6fa620ba9541a63c45
// Carried constructs are data, never runtime parity evidence.
function safety_for(os) {
  if (!(typeof os === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(os))) throw new TypeError('argument outside supported Rust value domain');
  if ((os === "macos")) {
    return Object.freeze({ $: 'Err', field0: "safe OS credential-store boundary unavailable: native macOS vendor probes are refused before version, doctor or TUI; use the disposable Linux verification environment" });
  } else {
    return Object.freeze({ $: 'Ok', field0: null });
  }
}

export const translated = { safety_for };
export const provenance = {"sourcePath":"src/verification_client.rs","sourceSha256":"5372f4f479b43128d298a7a09baaf104993da28d54981d6fa620ba9541a63c45","executable":1,"executableFunctions":1,"executableConstants":0,"carried":11,"preserved":13,"runtimeParity":false};
