// Generated draft from src/chat_commands.rs; sha256=7fb02cfdcd1f09b1bffe1ee45c1c56e29df84f1f59ea247b07b34e952da22325
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

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
  ml_validate_rust_value(label, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(ttl_hours, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  ml_validate_rust_value(max_requests, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(max_tokens, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(rate_limit_per_minute, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(account, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
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

function rp_636861745f636f6d6d616e64732e49535355455f4b455953() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Tuple', field0: "label", field1: Object.freeze(Object.freeze(["label", "name"])) }), Object.freeze({ $: 'Tuple', field0: "ttl_hours", field1: Object.freeze(Object.freeze(["ttl_hours", "ttl"])) }), Object.freeze({ $: 'Tuple', field0: "max_requests", field1: Object.freeze(Object.freeze(["max_requests", "requests"])) }), Object.freeze({ $: 'Tuple', field0: "max_tokens", field1: Object.freeze(Object.freeze(["max_tokens", "tokens"])) }), Object.freeze({ $: 'Tuple', field0: "rate_limit_per_minute", field1: Object.freeze(Object.freeze(["rate_limit_per_minute", "rpm", "rate"])) }), Object.freeze({ $: 'Tuple', field0: "account", field1: Object.freeze(Object.freeze(["account", "pin"])) })]));
}

function rp_636861745f636f6d6d616e64732e7965735f6e6f(value) {
  if (!(typeof value === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (value) {
    return "yes";
  } else {
    return "no";
  }
}

export const translated = { ["DEFAULT_ISSUE_TTL_HOURS"]: rp_636861745f636f6d6d616e64732e44454641554c545f49535355455f54544c5f484f555253(), ["LIST_LIMIT"]: rp_636861745f636f6d6d616e64732e4c4953545f4c494d4954(), ["IssueOptions"]: ml_make_IssueOptions_IssueOptions, ["ISSUE_KEYS"]: rp_636861745f636f6d6d616e64732e49535355455f4b455953(), ["yes_no"]: rp_636861745f636f6d6d616e64732e7965735f6e6f };
export const provenance = {"sourcePath":"src/chat_commands.rs","sourceSha256":"7fb02cfdcd1f09b1bffe1ee45c1c56e29df84f1f59ea247b07b34e952da22325","executable":5,"executableFunctions":1,"executableConstants":3,"executableTypes":1,"executableConstructors":1,"carried":29,"preserved":35,"runtimeParity":false};
