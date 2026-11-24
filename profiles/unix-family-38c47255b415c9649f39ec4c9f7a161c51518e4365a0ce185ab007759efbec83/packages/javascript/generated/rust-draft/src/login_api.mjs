// Generated draft from src/login_api.rs; sha256=b60b17c7777dc6c3fc6bfea570baed1f8d7adf40737f431a4cf7d04697ca55b0
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_f8fdc4ddb99a3cfb0504b511389e0b8e8e33a693787f57dfe137064b14e60494 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f38325f6e616d65645f3733373536323733363337323639373037343639366636655f373437393730363537335f35333735363237333633373236393730373436393666366535303732366637363639363436353732":{"kind":"data","name":"rp_526f757465724f7074696f6e5f38325f6e616d65645f3733373536323733363337323639373037343639366636655f373437393730363537335f35333735363237333633373236393730373436393666366535303732366637363639363436353732","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572"}}]}]},"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e50726f7669646572","ctors":[{"name":"Claude","fields":[]},{"name":"Codex","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

function rp_6c6f67696e5f6170692e7265717565737465645f70726f7669646572(value) {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  const ml_s1 = (((() => {
    const ml_standard_body_1 = value;
    const ml_standard_body_2 = "claude";
    switch (ml_standard_body_1.$) {
      case "None": {
        return ml_standard_body_2;
      }
      case "Some": {
        const x = ml_standard_body_1.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })()).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '')).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  if ((ml_s1 === "claude")) {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Claude' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38325f6e616d65645f3733373536323733363337323639373037343639366636655f373437393730363537335f35333735363237333633373236393730373436393666366535303732366637363639363436353732"}, ml_constructor_value_schema_f8fdc4ddb99a3cfb0504b511389e0b8e8e33a693787f57dfe137064b14e60494);
  } else {
    if ((ml_s1 === "codex")) {
      return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Codex' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38325f6e616d65645f3733373536323733363337323639373037343639366636655f373437393730363537335f35333735363237333633373236393730373436393666366535303732366637363639363436353732"}, ml_constructor_value_schema_f8fdc4ddb99a3cfb0504b511389e0b8e8e33a693787f57dfe137064b14e60494);
    } else {
      return Object.freeze({ $: 'None' });
    }
  }
}

export const translated = { ["requested_provider"]: rp_6c6f67696e5f6170692e7265717565737465645f70726f7669646572 };
export const provenance = {"sourcePath":"src/login_api.rs","sourceSha256":"b60b17c7777dc6c3fc6bfea570baed1f8d7adf40737f431a4cf7d04697ca55b0","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":17,"preserved":19,"runtimeParity":false};
