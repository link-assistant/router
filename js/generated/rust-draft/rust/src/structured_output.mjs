// Generated draft from rust/src/structured_output.rs; sha256=56e1eace0d52cac68b8f4c956057de1907b9eff1739143aaff49f3f62a0b2627
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { router_core_json_copy as ml_host_router_core_json_copy, router_core_json_with_field as ml_host_router_core_json_with_field, router_core_json_map_index as ml_host_router_core_json_map_index, router_core_json_index_str as ml_host_router_core_json_index_str } from "../../runtime/json-update-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_object as ml_host_serde_json_value_as_object, serde_json_value_is_boolean as ml_host_serde_json_value_is_boolean, serde_json_value_is_object as ml_host_serde_json_value_is_object, serde_json_map_get as ml_host_serde_json_map_get, serde_json_value_is_null as ml_host_serde_json_value_is_null } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy, assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

import { json_macro_null as ml_json_macro_null, json_macro_bool as ml_json_macro_bool, json_macro_string as ml_json_macro_string, json_macro_i64 as ml_json_macro_i64, json_macro_u64 as ml_json_macro_u64, json_macro_value as ml_json_macro_value, json_macro_array as ml_json_macro_array, json_macro_object as ml_json_macro_object } from "../../runtime/json-macro-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c = {"schemaVersion":1,"types":{"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"Ok","fields":[{"name":"field0","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}}]},{"name":"Err","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]}}};

const ml_constructor_value_schema_657a4168dfa80c6994f199a10cb1549cd1c313906aa1484d4377c52826fbd7d7 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]}}};

const ml_constructor_value_schema_78d7fab264b49616d8e6c460b95f8203f362e00a5723d748f8251a3b2945752b = {"schemaVersion":1,"types":{"rp_526f75746572526573756c745f37365f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f34643631373035663533373437323639366536373566353636313663373536355f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f75746572526573756c745f37365f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f34643631373035663533373437323639366536373566353636313663373536355f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"Ok","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]},{"name":"Err","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]}}};

const ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]}}};

const ml_constructor_value_schema_d2c0f512ae52649aa22d0c7a885d6cd5fe3d02afc441fd209e2e68547b91e865 = {"schemaVersion":1,"types":{"rp_526f75746572526573756c745f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f75746572526573756c745f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"Ok","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]},{"name":"Err","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]}}};

import { assertImmutableIterator as ml_pattern_immutable_view } from "../../runtime/iterator-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_router_try_return = Symbol('checked Rust early return');
function ml_router_try(value, option) {
  if (option) {
    if (value.$ === 'Some') return value.field0;
    if (value.$ === 'None') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'None' }) };
  } else {
    if (value.$ === 'Ok') return value.field0;
    if (value.$ === 'Err') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'Err', field0: value.field0 }) };
  }
  throw new TypeError('checked Rust ? operand does not match its standard Option/Result mode');
}
function ml_router_propagated(error) { return error && error[ml_router_try_return] === true; }

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

const ml_constructor_value_schema_ebfc7fd0b03d90e12915c5473d04a9586bae1bc9a84c5e968ed9e89e24b1a51d = {"schemaVersion":1,"types":{"rp_526f75746572526573756c745f33375f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f75746572526573756c745f33375f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"Ok","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]},{"name":"Err","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]}}};

function rp_737472756374757265645f6f75747075742e636861745f746f5f726573706f6e7365735f666f726d6174(value) {
try {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const ml_pattern_1 = value;
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
  }
  const value_2 = (ml_pattern_1)["field0"];
  const kind = ml_router_try(rp_737472756374757265645f6f75747075742e72657175697265645f74797065(value_2, "response_format"), false);
  if ((kind === "text")) {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_json_macro_object([["type", ml_json_macro_string("text")]]) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_657a4168dfa80c6994f199a10cb1549cd1c313906aa1484d4377c52826fbd7d7) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
  } else {
    if ((kind === "json_object")) {
      return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_json_macro_object([["type", ml_json_macro_string("json_object")]]) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_657a4168dfa80c6994f199a10cb1549cd1c313906aa1484d4377c52826fbd7d7) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
    } else {
      if ((kind === "json_schema")) {
        const definition = ml_router_try((() => {
    const ml_standard_body_10 = (() => { const ml_shared_immutable_value = ml_host_option_bind(ml_host_serde_json_value_get_string(value_2, "json_schema"), (ml_host_callback_7_0) => { return ml_host_serde_json_value_as_object(ml_host_callback_7_0); }, "and_then"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_body_10.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_fmt_9 = "response_format.json_schema must be an object";
          return ml_fmt_9;
        })() });
      }
      case "Some": {
        const v = ml_standard_body_10.field0;
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: v }), {"kind":"data","name":"rp_526f75746572526573756c745f37365f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f34643631373035663533373437323639366536373566353636313663373536355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_78d7fab264b49616d8e6c460b95f8203f362e00a5723d748f8251a3b2945752b);
      }
      default: {
        return ml_router_unexpected(ml_standard_body_10);
      }
    }
  })(), false);
        ml_router_try(rp_737472756374757265645f6f75747075742e76616c69646174655f6e616d655f616e645f737472696374(ml_host_serde_json_map_get(definition, "name"), ml_host_serde_json_map_get(definition, "strict"), "response_format.json_schema"), false);
        const schema_2 = ml_router_try((() => {
    const ml_standard_body_28 = (() => { const ml_shared_immutable_value = (() => {
      const ml_standard_callback_self_23 = (() => { const ml_shared_immutable_value = ml_host_serde_json_map_get(definition, "schema"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      return (() => {
      const ml_pattern_25 = ml_standard_callback_self_23;
      if ((ml_pattern_immutable_view(ml_pattern_25) && (ml_pattern_25.$ === "Some"))) {
        const ml_standard_pattern_24 = (ml_pattern_25)["field0"];
        if ((() => {
        const ml_standard_callback_arg_26 = ml_standard_pattern_24;
        const schema = ml_standard_callback_arg_26;
        return ml_host_serde_json_value_is_object(schema);
      })()) {
          return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_standard_pattern_24 }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67);
        } else {
        }
      } else {
      }
      return Object.freeze({ $: 'None' });
      })();
    })(); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_body_28.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_fmt_27 = "response_format.json_schema.schema must be an object";
          return ml_fmt_27;
        })() });
      }
      case "Some": {
        const v_2 = ml_standard_body_28.field0;
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: v_2 }), {"kind":"data","name":"rp_526f75746572526573756c745f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_d2c0f512ae52649aa22d0c7a885d6cd5fe3d02afc441fd209e2e68547b91e865);
      }
      default: {
        return ml_router_unexpected(ml_standard_body_28);
      }
    }
  })(), false);
        let format = ml_json_macro_object([["type", ml_json_macro_string("json_schema")], ["name", ml_json_macro_value(ml_host_router_core_json_map_index(definition, "name"))], ["schema", ml_json_macro_value(schema_2)]]);
        const ml_pattern_29 = ml_host_serde_json_map_get(definition, "strict");
        if ((ml_pattern_immutable_view(ml_pattern_29) && (ml_pattern_29.$ === "Some"))) {
          const strict = (ml_pattern_29)["field0"];
          (() => {
    const __router_json_rhs_394 = ml_host_router_core_json_copy(strict);
    format = ml_host_router_core_json_with_field(format, "strict", __router_json_rhs_394);
    return null;
  })();
        } else {
        }
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: format }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_657a4168dfa80c6994f199a10cb1549cd1c313906aa1484d4377c52826fbd7d7) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
      } else {
        const other = kind;
        return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_30 = other;
    return ("unsupported response_format type: " + ml_fmt_30);
  })() });
      }
    }
  }

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

function rp_737472756374757265645f6f75747075742e72657175697265645f74797065(value, path) {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_body_7 = (() => {
      const ml_standard_callback_self_2 = ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_as_object(value), (object) => { return ml_host_serde_json_map_get(object, "type"); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
      return (() => {
      const ml_pattern_4 = ml_standard_callback_self_2;
      if ((ml_pattern_immutable(ml_pattern_4) && (ml_pattern_4.$ === "Some"))) {
        const ml_standard_pattern_3 = (ml_pattern_4)["field0"];
        if ((() => {
        const ml_standard_callback_arg_5 = ml_standard_pattern_3;
        const kind = ml_standard_callback_arg_5;
        return !(kind.length === 0);
      })()) {
          return Object.freeze({ $: 'Some', field0: ml_standard_pattern_3 });
        } else {
        }
      } else {
      }
      return Object.freeze({ $: 'None' });
      })();
    })();
    switch (ml_standard_body_7.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_fmt_6 = path;
          return (ml_fmt_6 + ".type must be a non-empty string");
        })() });
      }
      case "Some": {
        const v = ml_standard_body_7.field0;
        return Object.freeze({ $: 'Ok', field0: v });
      }
      default: {
        return ml_router_unexpected(ml_standard_body_7);
      }
    }
  })();
}

function rp_737472756374757265645f6f75747075742e76616c69646174655f6e616d655f616e645f737472696374(name, strict, path) {
  ml_pattern_immutable_view(name);
  ml_validate_rust_value(name, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  ml_pattern_immutable_view(strict);
  ml_validate_rust_value(strict, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  if ((() => {
    const ml_standard_callback_self_3 = (() => {
      const __router_json_reader_0 = name;
      const ml_pattern_1 = __router_json_reader_0;
      if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
        const __router_json_reader_1 = (ml_pattern_1)["field0"];
        return ml_host_serde_json_value_as_str(__router_json_reader_1);
      } else {
        return Object.freeze({ $: 'None' });
      }
    })();
    switch (ml_standard_callback_self_3.$) {
      case "None": {
        return true;
      }
      case "Some": {
        const ml_standard_pattern_4 = ml_standard_callback_self_3.field0;
        const ml_standard_callback_arg_5 = ml_standard_pattern_4;
        const ml_standard_callback_1_0 = ml_standard_callback_arg_5;
        return (ml_standard_callback_1_0.length === 0);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_3);
      }
    }
  })()) {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_6 = path;
    return (ml_fmt_6 + ".name must be a non-empty string");
  })() });
  } else {
  }
  if ((() => {
    const ml_standard_callback_self_7 = (() => { const ml_shared_immutable_value = strict; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_callback_self_7.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_8 = ml_standard_callback_self_7.field0;
        const ml_standard_callback_arg_9 = ml_standard_pattern_8;
        const value = ml_standard_callback_arg_9;
        return !ml_host_serde_json_value_is_boolean(value);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_7);
      }
    }
  })()) {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_10 = path;
    return (ml_fmt_10 + ".strict must be a boolean");
  })() });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
}

function rp_737472756374757265645f6f75747075742e726573706f6e7365735f746f5f636861745f666f726d6174(text) {
try {
  ml_pattern_immutable_view(text);
  ml_validate_rust_value(text, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const ml_pattern_1 = text;
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
  }
  const text_2 = (ml_pattern_1)["field0"];
  const object = ml_router_try((() => {
    const ml_standard_body_7 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_as_object(text_2); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_body_7.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_fmt_6 = "text must be an object";
          return ml_fmt_6;
        })() });
      }
      case "Some": {
        const v = ml_standard_body_7.field0;
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: v }), {"kind":"data","name":"rp_526f75746572526573756c745f37365f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f34643631373035663533373437323639366536373566353636313663373536355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_78d7fab264b49616d8e6c460b95f8203f362e00a5723d748f8251a3b2945752b);
      }
      default: {
        return ml_router_unexpected(ml_standard_body_7);
      }
    }
  })(), false);
  const ml_pattern_12 = (() => {
    const ml_standard_callback_self_8 = (() => { const ml_shared_immutable_value = ml_host_serde_json_map_get(object, "format"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    return (() => {
    const ml_pattern_10 = ml_standard_callback_self_8;
    if ((ml_pattern_immutable_view(ml_pattern_10) && (ml_pattern_10.$ === "Some"))) {
      const ml_standard_pattern_9 = (ml_pattern_10)["field0"];
      if ((() => {
      const ml_standard_callback_arg_11 = ml_standard_pattern_9;
      const value = ml_standard_callback_arg_11;
      return !ml_host_serde_json_value_is_null(value);
    })()) {
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_standard_pattern_9 }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67);
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })();
  if ((ml_pattern_immutable_view(ml_pattern_12) && (ml_pattern_12.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
  }
  const format = (ml_pattern_12)["field0"];
  const ml_s13 = ml_router_try(rp_737472756374757265645f6f75747075742e72657175697265645f74797065(format, "text.format"), false);
  if ((ml_s13 === "text")) {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_json_macro_object([["type", ml_json_macro_string("text")]]) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_657a4168dfa80c6994f199a10cb1549cd1c313906aa1484d4377c52826fbd7d7) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
  } else {
    if ((ml_s13 === "json_object")) {
      return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_json_macro_object([["type", ml_json_macro_string("json_object")]]) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_657a4168dfa80c6994f199a10cb1549cd1c313906aa1484d4377c52826fbd7d7) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
    } else {
      if ((ml_s13 === "json_schema")) {
        ml_router_try(rp_737472756374757265645f6f75747075742e76616c69646174655f6e616d655f616e645f737472696374(ml_host_serde_json_value_get_string(format, "name"), ml_host_serde_json_value_get_string(format, "strict"), "text.format"), false);
        const schema_2 = ml_router_try((() => {
    const ml_standard_body_31 = (() => { const ml_shared_immutable_value = (() => {
      const ml_standard_callback_self_26 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(format, "schema"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      return (() => {
      const ml_pattern_28 = ml_standard_callback_self_26;
      if ((ml_pattern_immutable_view(ml_pattern_28) && (ml_pattern_28.$ === "Some"))) {
        const ml_standard_pattern_27 = (ml_pattern_28)["field0"];
        if ((() => {
        const ml_standard_callback_arg_29 = ml_standard_pattern_27;
        const schema = ml_standard_callback_arg_29;
        return ml_host_serde_json_value_is_object(schema);
      })()) {
          return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_standard_pattern_27 }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67);
        } else {
        }
      } else {
      }
      return Object.freeze({ $: 'None' });
      })();
    })(); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_body_31.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_fmt_30 = "text.format.schema must be an object";
          return ml_fmt_30;
        })() });
      }
      case "Some": {
        const v_2 = ml_standard_body_31.field0;
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: v_2 }), {"kind":"data","name":"rp_526f75746572526573756c745f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_d2c0f512ae52649aa22d0c7a885d6cd5fe3d02afc441fd209e2e68547b91e865);
      }
      default: {
        return ml_router_unexpected(ml_standard_body_31);
      }
    }
  })(), false);
        let definition = ml_json_macro_object([["name", ml_json_macro_value(ml_host_router_core_json_index_str(format, "name"))], ["schema", ml_json_macro_value(schema_2)]]);
        const ml_pattern_32 = ml_host_serde_json_value_get_string(format, "strict");
        if ((ml_pattern_immutable_view(ml_pattern_32) && (ml_pattern_32.$ === "Some"))) {
          const strict = (ml_pattern_32)["field0"];
          (() => {
    const __router_json_rhs_394 = ml_host_router_core_json_copy(strict);
    definition = ml_host_router_core_json_with_field(definition, "strict", __router_json_rhs_394);
    return null;
  })();
        } else {
        }
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_json_macro_object([["type", ml_json_macro_string("json_schema")], ["json_schema", ml_json_macro_value(definition)]]) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_657a4168dfa80c6994f199a10cb1549cd1c313906aa1484d4377c52826fbd7d7) }), {"kind":"data","name":"rp_526f75746572526573756c745f3131325f6e616d65645f353236663735373436353732346637303734363936663665356633333337356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633353336333633313336363333373335333633355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ed607e7ad1c47328e3b460030132927507a585a129c3c794205b46c6278b194c);
      } else {
        const other = ml_s13;
        return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_33 = other;
    return ("unsupported text.format type: " + ml_fmt_33);
  })() });
      }
    }
  }

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

function rp_737472756374757265645f6f75747075742e736368656d615f666f726d6174(schema, path) {
try {
  ml_pattern_immutable_view(schema);
  ml_validate_rust_value(schema, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  const schema_3 = ml_router_try((() => {
    const ml_standard_body_18 = (() => { const ml_shared_immutable_value = (() => {
      const ml_standard_callback_self_13 = (() => { const ml_shared_immutable_value = schema; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      return (() => {
      const ml_pattern_15 = ml_standard_callback_self_13;
      if ((ml_pattern_immutable_view(ml_pattern_15) && (ml_pattern_15.$ === "Some"))) {
        const ml_standard_pattern_14 = (ml_pattern_15)["field0"];
        if ((() => {
        const ml_standard_callback_arg_16 = ml_standard_pattern_14;
        const schema_2 = ml_standard_callback_arg_16;
        return ml_host_serde_json_value_is_object(schema_2);
      })()) {
          return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_standard_pattern_14 }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67);
        } else {
        }
      } else {
      }
      return Object.freeze({ $: 'None' });
      })();
    })(); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_body_18.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_fmt_17 = path;
          return (ml_fmt_17 + " must be an object");
        })() });
      }
      case "Some": {
        const v = ml_standard_body_18.field0;
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: v }), {"kind":"data","name":"rp_526f75746572526573756c745f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_d2c0f512ae52649aa22d0c7a885d6cd5fe3d02afc441fd209e2e68547b91e865);
      }
      default: {
        return ml_router_unexpected(ml_standard_body_18);
      }
    }
  })(), false);
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: ml_json_macro_object([["type", ml_json_macro_string("json_schema")], ["schema", ml_json_macro_value(schema_3)]]) }), {"kind":"data","name":"rp_526f75746572526573756c745f33375f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_ebfc7fd0b03d90e12915c5473d04a9586bae1bc9a84c5e968ed9e89e24b1a51d);

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

function rp_737472756374757265645f6f75747075742e67656e657269635f6f626a6563745f666f726d6174() {
  return ml_json_macro_object([["type", ml_json_macro_string("json_schema")], ["schema", ml_json_macro_object([["type", ml_json_macro_string("object")], ["additionalProperties", ml_json_macro_bool(true)]])]]);
}

export const translated = { ["chat_to_responses_format"]: rp_737472756374757265645f6f75747075742e636861745f746f5f726573706f6e7365735f666f726d6174, ["responses_to_chat_format"]: rp_737472756374757265645f6f75747075742e726573706f6e7365735f746f5f636861745f666f726d6174, ["required_type"]: rp_737472756374757265645f6f75747075742e72657175697265645f74797065, ["validate_name_and_strict"]: rp_737472756374757265645f6f75747075742e76616c69646174655f6e616d655f616e645f737472696374, ["schema_format"]: rp_737472756374757265645f6f75747075742e736368656d615f666f726d6174, ["generic_object_format"]: rp_737472756374757265645f6f75747075742e67656e657269635f6f626a6563745f666f726d6174 };
export const provenance = {"sourcePath":"rust/src/structured_output.rs","sourceSha256":"56e1eace0d52cac68b8f4c956057de1907b9eff1739143aaff49f3f62a0b2627","executable":6,"executableFunctions":6,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":14,"runtimeParity":false};
