// Generated draft from rust/src/bridge_request_tools.rs; sha256=5ba0389968e32e9c99eebd7a38d32c80c8278e86278ace56290025c71a636941
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_bool as ml_host_serde_json_value_as_bool, serde_json_value_is_null as ml_host_serde_json_value_is_null } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy } from "../../runtime/copy-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]}}};

const ml_constructor_value_schema_a8bf5fbbae3568907e81dae055291ac73733855f3b5ae4f165ca7b38e10bd5da = {"schemaVersion":1,"types":{"rp_526f75746572526573756c745f34345f6e616d65645f35323666373537343635373234663730373436393666366535663334356636323666366636635f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f75746572526573756c745f34345f6e616d65645f35323666373537343635373234663730373436393666366535663334356636323666366636635f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"Ok","fields":[{"name":"field0","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}}]},{"name":"Err","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_526f757465724f7074696f6e5f345f626f6f6c":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"bool"}}]}]}}};

import { assertImmutableIterator as ml_pattern_immutable_view } from "../../runtime/iterator-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_6272696467655f726571756573742e746f6f6c732e616e7468726f7069635f706172616c6c656c5f746f6f6c5f63616c6c73(body) {
  ml_pattern_immutable_view(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_3 = (() => {
    const ml_standard_callback_self_1 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(body, "tool_choice"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    return (() => {
    const ml_pattern_1 = ml_standard_callback_self_1;
    if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
      const ml_standard_pattern_2 = (ml_pattern_1)["field0"];
      if ((() => {
      const ml_standard_callback_arg_2 = ml_standard_pattern_2;
      const value = ml_standard_callback_arg_2;
      return !ml_host_serde_json_value_is_null(value);
    })()) {
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_standard_pattern_2 }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67);
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })();
  if ((ml_pattern_immutable_view(ml_pattern_3) && (ml_pattern_3.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34345f6e616d65645f35323666373537343635373234663730373436393666366535663334356636323666366636635f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_a8bf5fbbae3568907e81dae055291ac73733855f3b5ae4f165ca7b38e10bd5da);
  }
  const choice = (ml_pattern_3)["field0"];
  const ml_pattern_4 = ml_host_serde_json_value_get_string(choice, "disable_parallel_tool_use");
  if ((ml_pattern_immutable_view(ml_pattern_4) && (ml_pattern_4.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34345f6e616d65645f35323666373537343635373234663730373436393666366535663334356636323666366636635f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_a8bf5fbbae3568907e81dae055291ac73733855f3b5ae4f165ca7b38e10bd5da);
  }
  const disable = (ml_pattern_4)["field0"];
  return (() => {
    const ml_standard_body_1 = ml_host_option_map(ml_host_serde_json_value_as_bool(disable), (disable_2) => { return Object.freeze({ $: 'Some', field0: !disable_2 }); });
    switch (ml_standard_body_1.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_conversion_source_5 = "tool_choice.disable_parallel_tool_use must be a boolean";
          return ml_conversion_source_5;
        })() });
      }
      case "Some": {
        const v = ml_standard_body_1.field0;
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: v }), {"kind":"data","name":"rp_526f75746572526573756c745f34345f6e616d65645f35323666373537343635373234663730373436393666366535663334356636323666366636635f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_a8bf5fbbae3568907e81dae055291ac73733855f3b5ae4f165ca7b38e10bd5da);
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })();
}

export const translated = { ["anthropic_parallel_tool_calls"]: rp_6272696467655f726571756573742e746f6f6c732e616e7468726f7069635f706172616c6c656c5f746f6f6c5f63616c6c73 };
export const provenance = {"sourcePath":"rust/src/bridge_request_tools.rs","sourceSha256":"5ba0389968e32e9c99eebd7a38d32c80c8278e86278ace56290025c71a636941","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":6,"preserved":7,"runtimeParity":false};
