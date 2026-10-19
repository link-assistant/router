type MLData_72705f353236663735373436353732346637303734363936663665356633323339356637323635363636353732363536653633363535663733363836313732363536343566363137323732363137393566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<string> }>;
type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
type MLData_72705f373337353632373336333732363937303734363936663665326537343739373036353733326535333735363237333633373236393730373436393666366535303732366637363639363436353732 = Readonly<{ readonly "$": "Claude" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Qwen" }>;
// Generated draft from rust/src/vendor_cli_refresh.rs; sha256=cfef45c8a449b274398ab8909cd36f8bd472ca7a3b46e84154278bcc5430d7de
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7c0506ee7e7f866ac68e089b95cf87fd7b4750494fad9af98744898431a3dd21 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f32395f7265666572656e63655f7368617265645f61727261795f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f32395f7265666572656e63655f7368617265645f61727261795f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"string"}}}]}]}}};

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = {"schemaVersion":1,"types":{"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572","ctors":[{"name":"Claude","fields":[]},{"name":"Codex","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

const ml_host_value_refinements_51de05c14267844c78097d64e02c26983c85940fe13c09826e02f97569d6ecb3 = new Map([]);

function rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(90n);
}

function rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["-p", "ok"]));
}

function rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["exec", "--skip-git-repo-check", "ok"]));
}

function rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56(): string {
  return "ROUTER_VENDOR_REFRESH_ARGS";
}

function rp_76656e646f725f636c695f726566726573682e70726f62655f666f72(provider: Readonly<{ readonly "$": "Claude" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Qwen" }>): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<string> }> {
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

export const translated: { "DEFAULT_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "CLAUDE_PROBE": ReadonlyArray<string>; "CODEX_PROBE": ReadonlyArray<string>; "PROBE_ARGS_ENV": string; "probe_for": (provider: Readonly<{ readonly "$": "Claude" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Qwen" }>) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<string> }> } = { ["DEFAULT_TIMEOUT"]: rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554(), ["CLAUDE_PROBE"]: rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245(), ["CODEX_PROBE"]: rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245(), ["PROBE_ARGS_ENV"]: rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56(), ["probe_for"]: rp_76656e646f725f636c695f726566726573682e70726f62655f666f72 };
export const provenance = {"sourcePath":"rust/src/vendor_cli_refresh.rs","sourceSha256":"cfef45c8a449b274398ab8909cd36f8bd472ca7a3b46e84154278bcc5430d7de","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":16,"runtimeParity":false};
