// Generated draft from tests/storage_format_boundaries_test.rs; sha256=4ea32f224de2de32c36a72059229214df84eb0ed5c8e061a709f97b2c64f766b
// Carried constructs are data, never runtime parity evidence.
import { serde_json_from_str as ml_host_serde_json_from_str } from "../runtime/json-runtime.mjs";

function is_json(line) {
  if (!(typeof line === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(line))) throw new TypeError('argument outside supported Rust value domain');
  return (ml_host_serde_json_from_str(line).$ === 'Ok');
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

export const translated = { ["is_json"]: is_json };
export const provenance = {"sourcePath":"tests/storage_format_boundaries_test.rs","sourceSha256":"4ea32f224de2de32c36a72059229214df84eb0ed5c8e061a709f97b2c64f766b","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":17,"runtimeParity":false};
