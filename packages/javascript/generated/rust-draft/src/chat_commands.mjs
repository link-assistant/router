// Generated draft from src/chat_commands.rs; sha256=7fb02cfdcd1f09b1bffe1ee45c1c56e29df84f1f59ea247b07b34e952da22325
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

const ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = new Map([]);

const ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = new Map([]);

function rp_636861745f636f6d6d616e64732e44454641554c545f49535355455f54544c5f484f555253() {
  return 24n;
}

function rp_636861745f636f6d6d616e64732e4c4953545f4c494d4954() {
  return 30n;
}

function ml_make_IssueOptions_IssueOptions(label, ttl_hours, max_requests, max_tokens, rate_limit_per_minute, account) {
  ml_validate_rust_value(label, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(ttl_hours, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  ml_validate_rust_value(max_requests, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(max_tokens, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(rate_limit_per_minute, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(account, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: "IssueOptions", ["label"]: label, ["ttl_hours"]: ttl_hours, ["max_requests"]: max_requests, ["max_tokens"]: max_tokens, ["rate_limit_per_minute"]: rate_limit_per_minute, ["account"]: account });
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

function rp_636861745f636f6d6d616e64732e7965735f6e6f(value) {
  if (!(typeof value === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (value) {
    return "yes";
  } else {
    return "no";
  }
}

export const translated = { ["DEFAULT_ISSUE_TTL_HOURS"]: rp_636861745f636f6d6d616e64732e44454641554c545f49535355455f54544c5f484f555253(), ["LIST_LIMIT"]: rp_636861745f636f6d6d616e64732e4c4953545f4c494d4954(), ["IssueOptions"]: ml_make_IssueOptions_IssueOptions, ["yes_no"]: rp_636861745f636f6d6d616e64732e7965735f6e6f };
export const provenance = {"sourcePath":"src/chat_commands.rs","sourceSha256":"7fb02cfdcd1f09b1bffe1ee45c1c56e29df84f1f59ea247b07b34e952da22325","executable":4,"executableFunctions":1,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":30,"preserved":35,"runtimeParity":false};
