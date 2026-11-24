// Generated draft from src/clients/repair.rs; sha256=181d456276c5284f5357cb0048d9ec57af43697526d52c7b912356c56fdf965a
// Carried constructs are data, never runtime parity evidence.
function rp_636c69656e74732e7265706169722e7472616e73616374696f6e5f636865636b706f696e74(_stage) {
  if (!(typeof _stage === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(_stage))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Ok', field0: null });
}

export const translated = { ["transaction_checkpoint"]: rp_636c69656e74732e7265706169722e7472616e73616374696f6e5f636865636b706f696e74 };
export const provenance = {"sourcePath":"src/clients/repair.rs","sourceSha256":"181d456276c5284f5357cb0048d9ec57af43697526d52c7b912356c56fdf965a","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":28,"runtimeParity":false};
