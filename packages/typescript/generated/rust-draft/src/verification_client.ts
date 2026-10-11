type MLData_72705f3532366637353734363537323532363537333735366337343566333435663735366536393734356633363566373337343732363936653637 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>;
// Generated draft from src/verification_client.rs; sha256=5372f4f479b43128d298a7a09baaf104993da28d54981d6fa620ba9541a63c45
// Carried constructs are data, never runtime parity evidence.
function rp_766572696669636174696f6e5f636c69656e742e7361666574795f666f72(os: string): Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> {
  if (!(typeof os === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(os))) throw new TypeError('argument outside supported Rust value domain');
  if ((os === "macos")) {
    return Object.freeze({ $: 'Err', field0: "safe OS credential-store boundary unavailable: native macOS vendor probes are refused before version, doctor or TUI; use the disposable Linux verification environment" });
  } else {
    return Object.freeze({ $: 'Ok', field0: null });
  }
}

export const translated: { "safety_for": (os: string) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> } = { ["safety_for"]: rp_766572696669636174696f6e5f636c69656e742e7361666574795f666f72 };
export const provenance = {"sourcePath":"src/verification_client.rs","sourceSha256":"5372f4f479b43128d298a7a09baaf104993da28d54981d6fa620ba9541a63c45","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":11,"preserved":13,"runtimeParity":false};
