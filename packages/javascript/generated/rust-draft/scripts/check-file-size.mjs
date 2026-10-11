// Generated draft from scripts/check-file-size.rs; sha256=d403183501317762cd6077a2b3f1a858cd5297c45078adafc319e53c7043174a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_LINES() {
  return 1000n;
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

function FILE_EXTENSIONS() {
  return Object.freeze([".rs"]);
}

function EXCLUDE_PATTERNS() {
  return Object.freeze(["target", ".git", "node_modules", "dev/log"]);
}

function ml_make_Violation_Violation(file, lines) {
  if (!(typeof file === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(lines, 0n, 18446744073709551615n, "u64 argument lines out of range");
  if (!(typeof lines === 'bigint' && lines >= 0n && lines <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Violation", ["file"]: file, ["lines"]: lines });
}

export const translated = { ["MAX_LINES"]: MAX_LINES(), ["FILE_EXTENSIONS"]: FILE_EXTENSIONS(), ["EXCLUDE_PATTERNS"]: EXCLUDE_PATTERNS(), ["Violation"]: ml_make_Violation_Violation };
export const provenance = {"sourcePath":"scripts/check-file-size.rs","sourceSha256":"d403183501317762cd6077a2b3f1a858cd5297c45078adafc319e53c7043174a","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":1,"carried":8,"preserved":12,"runtimeParity":false};
