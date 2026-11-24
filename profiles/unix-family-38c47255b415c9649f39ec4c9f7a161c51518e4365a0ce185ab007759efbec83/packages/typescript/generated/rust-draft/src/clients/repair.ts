type MLData_72705f35323666373537343635373235323635373337353663373435663334356637353665363937343566333533343566366536313664363536343566333633333336363333363339333633353336363533373334333733333566333733343337333933373330333633353337333335663334333333363633333633393336333533363635333733343334333533373332333733323336363633373332 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_72705f3633366336393635366537343733326537343739373036353733326534333663363936353665373434353732373236663732 }>;
type MLData_72705f3633366336393635366537343733326537343739373036353733326534333663363936353665373434353732373236663732 = Readonly<{ readonly "$": "ClientError"; readonly "field0": string }>;
// Generated draft from src/clients/repair.rs; sha256=181d456276c5284f5357cb0048d9ec57af43697526d52c7b912356c56fdf965a
// Carried constructs are data, never runtime parity evidence.
function rp_636c69656e74732e7265706169722e7472616e73616374696f6e5f636865636b706f696e74(_stage: string): Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": Readonly<{ readonly "$": "ClientError"; readonly "field0": string }> }> {
  if (!(typeof _stage === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(_stage))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Ok', field0: null });
}

export const translated: { "transaction_checkpoint": (_stage: string) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": Readonly<{ readonly "$": "ClientError"; readonly "field0": string }> }> } = { ["transaction_checkpoint"]: rp_636c69656e74732e7265706169722e7472616e73616374696f6e5f636865636b706f696e74 };
export const provenance = {"sourcePath":"src/clients/repair.rs","sourceSha256":"181d456276c5284f5357cb0048d9ec57af43697526d52c7b912356c56fdf965a","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":28,"runtimeParity":false};
