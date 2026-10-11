// Generated draft from scripts/bump-version.rs; sha256=1c0ca091123e298f6e5cc02b6b9a01a0172088c252dbaf9e9ce9348a412fe723
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_BumpType_Major() {
  return Object.freeze({ $: 'Major' });
}

function ml_make_BumpType_Minor() {
  return Object.freeze({ $: 'Minor' });
}

function ml_make_BumpType_Patch() {
  return Object.freeze({ $: 'Patch' });
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function ml_make_Version_Version(major, minor, patch) {
  ml_fixed(major, 0n, 4294967295n, "u32 argument major out of range");
  if (!(typeof major === 'bigint' && major >= 0n && major <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(minor, 0n, 4294967295n, "u32 argument minor out of range");
  if (!(typeof minor === 'bigint' && minor >= 0n && minor <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(patch, 0n, 4294967295n, "u32 argument patch out of range");
  if (!(typeof patch === 'bigint' && patch >= 0n && patch <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Version", ["major"]: major, ["minor"]: minor, ["patch"]: patch });
}

function get_cargo_toml_path(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (() => {
    const ml_fmt_1 = rust_root;
    return (ml_fmt_1 + "/Cargo.toml");
  })();
  }
}

export const translated = { ["BumpType"]: Object.freeze({ ["Major"]: ml_make_BumpType_Major, ["Minor"]: ml_make_BumpType_Minor, ["Patch"]: ml_make_BumpType_Patch }), ["Version"]: ml_make_Version_Version, ["get_cargo_toml_path"]: get_cargo_toml_path };
export const provenance = {"sourcePath":"scripts/bump-version.rs","sourceSha256":"1c0ca091123e298f6e5cc02b6b9a01a0172088c252dbaf9e9ce9348a412fe723","executable":3,"executableFunctions":1,"executableConstants":0,"executableTypes":2,"executableConstructors":4,"carried":13,"preserved":16,"runtimeParity":false};
