// Generated draft from scripts/check-release-needed.rs; sha256=d417c95c3315bb91bfde2a80886c52166e32ec93398f635daf880e4ae7771fda
// Carried constructs are data, never runtime parity evidence.
function recovery_skip_bump(has_fragments: boolean, tagged_head: boolean) {
  if (!(typeof has_fragments === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof tagged_head === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (tagged_head) {
    return Object.freeze({ $: 'Ok', field0: true });
  } else {
    if (has_fragments) {
      return Object.freeze({ $: 'Ok', field0: false });
    } else {
      return Object.freeze({ $: 'Err', field0: "main has no pending release fragment and HEAD is not the current release tag; refusing to publish changed source under an existing version" });
    }
  }
}

function get_cargo_toml_path(rust_root: string) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

export const translated: { "recovery_skip_bump": (has_fragments: boolean, tagged_head: boolean) => Readonly<{ $: "Ok"; field0: boolean }> | Readonly<{ $: "Err"; field0: string }>; "get_cargo_toml_path": (rust_root: string) => string } = { recovery_skip_bump, get_cargo_toml_path };
export const provenance = {"sourcePath":"scripts/check-release-needed.rs","sourceSha256":"d417c95c3315bb91bfde2a80886c52166e32ec93398f635daf880e4ae7771fda","executable":2,"executableFunctions":2,"executableConstants":0,"carried":23,"preserved":25,"runtimeParity":false};
