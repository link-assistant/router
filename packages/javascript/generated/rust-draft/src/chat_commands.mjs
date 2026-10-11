// Generated draft from src/chat_commands.rs; sha256=7fb02cfdcd1f09b1bffe1ee45c1c56e29df84f1f59ea247b07b34e952da22325
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_as_secs as ml_host_duration_as_secs, std_time_duration_is_zero as ml_host_std_time_duration_is_zero, std_time_duration_as_secs as ml_host_std_time_duration_as_secs } from "../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 = {"schemaVersion":1,"types":{"rp_7374642e74696d652e4475726174696f6e":{"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e","ctors":[{"name":"Duration","fields":[{"name":"secs","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"nanos","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 = new Map([["rp_7374642e74696d652e4475726174696f6e", ml_validate_duration]]);

function ml_validate_duration(value) { ml_host_duration_as_secs(value); return true; }

function DEFAULT_ISSUE_TTL_HOURS() {
  return 24n;
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
};

const serde_json = {
  error: {

  },
};

function LIST_LIMIT() {
  return 30n;
}

function rp_636861745f636f6d6d616e64732e64656c6574696f6e5f6e6f7465(secret_ttl) {
  ml_validate_rust_value(secret_ttl, {"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e"}, ml_host_value_schema_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7, { refinements: ml_host_value_refinements_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 });
  if (ml_host_std_time_duration_is_zero(secret_ttl)) {
    return "";
  } else {
    return (("\n\nI will delete this message in " + String(ml_host_std_time_duration_as_secs(secret_ttl))) + "s where the platform allows it — copy it now.");
  }
}

function yes_no(value) {
  if (!(typeof value === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (value) {
    return "yes";
  } else {
    return "no";
  }
}

export const translated = { ["DEFAULT_ISSUE_TTL_HOURS"]: DEFAULT_ISSUE_TTL_HOURS(), ["LIST_LIMIT"]: LIST_LIMIT(), ["deletion_note"]: rp_636861745f636f6d6d616e64732e64656c6574696f6e5f6e6f7465, ["yes_no"]: yes_no };
export const provenance = {"sourcePath":"src/chat_commands.rs","sourceSha256":"7fb02cfdcd1f09b1bffe1ee45c1c56e29df84f1f59ea247b07b34e952da22325","executable":4,"executableFunctions":2,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":30,"preserved":35,"runtimeParity":false};
