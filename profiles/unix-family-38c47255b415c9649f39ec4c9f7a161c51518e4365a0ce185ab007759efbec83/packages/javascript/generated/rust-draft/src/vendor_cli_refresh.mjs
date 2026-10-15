// Generated draft from src/vendor_cli_refresh.rs; sha256=f654f57e03a27282db948828b20e54d4d93d33517ce174b3a7a18255046e1cd9
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7c0506ee7e7f866ac68e089b95cf87fd7b4750494fad9af98744898431a3dd21 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f32395f7265666572656e63655f7368617265645f61727261795f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f32395f7265666572656e63655f7368617265645f61727261795f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"string"}}}]}]}}};

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = {"schemaVersion":1,"types":{"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572","ctors":[{"name":"Claude","fields":[]},{"name":"Codex","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

const ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = new Map([]);

function rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(90n);
}

function rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245() {
  return Object.freeze(Object.freeze(["-p", "ok"]));
}

function rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245() {
  return Object.freeze(Object.freeze(["exec", "--skip-git-repo-check", "ok"]));
}

function rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56() {
  return "ROUTER_VENDOR_REFRESH_ARGS";
}

function rp_76656e646f725f636c695f726566726573682e70726f62655f666f72(provider) {
  ml_validate_rust_value(provider, {"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572"}, ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3, { refinements: ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 });
  switch (provider.$) {
    case "Claude": {
      return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245() }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f32395f7265666572656e63655f7368617265645f61727261795f737472696e67"}, ml_constructor_value_schema_7c0506ee7e7f866ac68e089b95cf87fd7b4750494fad9af98744898431a3dd21);
    }
    case "Codex": {
      return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245() }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f32395f7265666572656e63655f7368617265645f61727261795f737472696e67"}, ml_constructor_value_schema_7c0506ee7e7f866ac68e089b95cf87fd7b4750494fad9af98744898431a3dd21);
    }
    case "Gemini": {
      return Object.freeze({ $: 'None' });
    }
    case "Qwen": {
      return Object.freeze({ $: 'None' });
    }
    default: {
      return ml_router_unexpected(provider);
    }
  }
}

export const translated = { ["DEFAULT_TIMEOUT"]: rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554(), ["CLAUDE_PROBE"]: rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245(), ["CODEX_PROBE"]: rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245(), ["PROBE_ARGS_ENV"]: rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56(), ["probe_for"]: rp_76656e646f725f636c695f726566726573682e70726f62655f666f72 };
export const provenance = {"sourcePath":"src/vendor_cli_refresh.rs","sourceSha256":"f654f57e03a27282db948828b20e54d4d93d33517ce174b3a7a18255046e1cd9","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":16,"runtimeParity":false};
