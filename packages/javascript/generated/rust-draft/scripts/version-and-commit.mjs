// Generated draft from scripts/version-and-commit.rs; sha256=84a40f7ecda5fff955155dc7e760577d9b1f955d7e83b8f69423c94c85e7a869
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function get_cargo_toml_path(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
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

function get_cargo_lock_path(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./Cargo.lock";
  } else {
    return (rust_root + "/Cargo.lock");
  }
}

function get_changelog_dir(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./changelog.d";
  } else {
    return (rust_root + "/changelog.d");
  }
}

function get_changelog_path(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./CHANGELOG.md";
  } else {
    return (rust_root + "/CHANGELOG.md");
  }
}

function ml_make_Version_Version(major, minor, patch) {
  ml_fixed(major, 0n, 4294967295n, "u32 argument major out of range");
  if (!(typeof major === 'bigint' && major >= 0n && major <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(minor, 0n, 4294967295n, "u32 argument minor out of range");
  if (!(typeof minor === 'bigint' && minor >= 0n && minor <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(patch, 0n, 4294967295n, "u32 argument patch out of range");
  if (!(typeof patch === 'bigint' && patch >= 0n && patch <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Version", ["major"]: major, ["minor"]: minor, ["patch"]: patch });
}

export const translated = { ["get_cargo_toml_path"]: get_cargo_toml_path, ["get_cargo_lock_path"]: get_cargo_lock_path, ["get_changelog_dir"]: get_changelog_dir, ["get_changelog_path"]: get_changelog_path, ["Version"]: ml_make_Version_Version };
export const provenance = {"sourcePath":"scripts/version-and-commit.rs","sourceSha256":"84a40f7ecda5fff955155dc7e760577d9b1f955d7e83b8f69423c94c85e7a869","executable":5,"executableFunctions":4,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":20,"preserved":25,"runtimeParity":false};
