type MLData_72705f3532366637353734363537323532363537333735366337343566333435663735366536393734356633363566373337343732363936653637 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>;
type MLData_72705f35323666373537343635373235343735373036633635356633363566373337343732363936653637356633363566373337343732363936653637356637323735373337343566333536323337363233323332333733333336363633373335333733323336333333363335333436363337333733363635333633353337333233373333333633383336333933373330333233323333363133373632333233323336363233363339333636353336333433323332333336313332333233363332333636363337333233373332333636363337333733363335333633343332333233323633333233323337333333363636333733353337333233363333333633353332333233333631333233323337333333373334333733323332333233373634333736343332363333373632333233323337333333363636333733353337333233363333333633353334363633373337333636353336333533373332333733333336333833363339333733303332333233333631333736323332333233363632333633393336363533363334333233323333363133323332333633323336363633373332333733323336363633373337333633353336333433323332333236333332333233373333333636363337333533373332333633333336333533323332333336313332333233373333333733343337333233323332333736343337363433353634 = Readonly<{ readonly "$": "Tuple"; readonly "field0": string; readonly "field1": string }>;
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

function rp_766572696669636174696f6e5f636c69656e742e434c49454e5453(): ReadonlyArray<Readonly<{ readonly "$": "Tuple"; readonly "field0": string; readonly "field1": string }>> {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Tuple', field0: "claude", field1: "ROUTER_REAL_CLIENT_CLAUDE_VERSION" }), Object.freeze({ $: 'Tuple', field0: "codex", field1: "ROUTER_REAL_CLIENT_CODEX_VERSION" }), Object.freeze({ $: 'Tuple', field0: "opencode", field1: "ROUTER_REAL_CLIENT_OPENCODE_VERSION" })]));
}

export const translated: { "safety_for": (os: string) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>; "CLIENTS": ReadonlyArray<Readonly<{ readonly "$": "Tuple"; readonly "field0": string; readonly "field1": string }>> } = { ["safety_for"]: rp_766572696669636174696f6e5f636c69656e742e7361666574795f666f72, ["CLIENTS"]: rp_766572696669636174696f6e5f636c69656e742e434c49454e5453() };
export const provenance = {"sourcePath":"src/verification_client.rs","sourceSha256":"5372f4f479b43128d298a7a09baaf104993da28d54981d6fa620ba9541a63c45","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":13,"runtimeParity":false};
