// Generated draft from rust/src/safety_identifier.rs; sha256=3fc317d7db138e9316e77a959f0e77a747cf9eba0ce805af20210e4035f19cca
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { router_core_unicode_scalar_count as ml_host_router_core_unicode_scalar_count } from "../../runtime/string-iterator-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view } from "../../runtime/iterator-runtime.mjs";

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_object as ml_host_serde_json_value_as_object, serde_json_map_get as ml_host_serde_json_map_get } from "../../runtime/json-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0 = {"schemaVersion":1,"types":{"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"Ok","fields":[{"name":"field0","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}}]},{"name":"Err","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

import { assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

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

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253() {
  return 64n;
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169(identifier) {
  ml_validate_rust_value(identifier, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  if ((() => {
    const ml_standard_callback_self_1 = identifier;
    switch (ml_standard_callback_self_1.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_2 = ml_standard_callback_self_1.field0;
        const ml_standard_callback_arg_1 = ml_standard_pattern_2;
        const value = ml_standard_callback_arg_1;
        return (ml_host_router_core_unicode_scalar_count(value) > rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253());
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_1);
      }
    }
  })()) {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_2 = rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253();
    return (("safety_identifier must contain at most " + String(ml_fmt_2)) + " characters");
  })() });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f76616c7565(value) {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  return (() => {
    const ml_ordered_match_1 = value;
    ml_pattern_immutable_view(ml_ordered_match_1);
    return (() => {
      if ((ml_ordered_match_1.$ === "None")) {
        return Object.freeze({ $: 'Ok', field0: null });
      }
      if (((ml_ordered_match_1.$ === "Some") && ((ml_ordered_match_1)["field0"].$ === "Null"))) {
        return Object.freeze({ $: 'Ok', field0: null });
      }
      if (((ml_ordered_match_1.$ === "Some") && ((ml_ordered_match_1)["field0"].$ === "String"))) {
        const ml_guard_binding_2 = ((ml_ordered_match_1)["field0"])["field0"];
        return rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169(Object.freeze({ $: 'Some', field0: ml_guard_binding_2 }));
      }
      if ((ml_ordered_match_1.$ === "Some")) {
        return Object.freeze({ $: 'Err', field0: (() => {
      const ml_arm_ml_conversion_source_3_1 = "safety_identifier must be a string";
      return ml_arm_ml_conversion_source_3_1;
    })() });
      }
      throw new Error("unreachable exhaustive ordered match");
    })();
  })();
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f75736572(user) {
  ml_validate_rust_value(user, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  if ((() => {
    const ml_standard_callback_self_1 = user;
    switch (ml_standard_callback_self_1.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_2 = ml_standard_callback_self_1.field0;
        const ml_standard_callback_arg_1 = ml_standard_pattern_2;
        const value = ml_standard_callback_arg_1;
        return (ml_host_router_core_unicode_scalar_count(value) > rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253());
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_1);
      }
    }
  })()) {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_2 = rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253();
    return (("user must contain at most " + String(ml_fmt_2)) + " characters");
  })() });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f757365725f76616c7565(value) {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  return (() => {
    const ml_ordered_match_1 = value;
    ml_pattern_immutable_view(ml_ordered_match_1);
    return (() => {
      if ((ml_ordered_match_1.$ === "None")) {
        return Object.freeze({ $: 'Ok', field0: null });
      }
      if (((ml_ordered_match_1.$ === "Some") && ((ml_ordered_match_1)["field0"].$ === "Null"))) {
        return Object.freeze({ $: 'Ok', field0: null });
      }
      if (((ml_ordered_match_1.$ === "Some") && ((ml_ordered_match_1)["field0"].$ === "String"))) {
        const ml_guard_binding_2 = ((ml_ordered_match_1)["field0"])["field0"];
        return rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f75736572(Object.freeze({ $: 'Some', field0: ml_guard_binding_2 }));
      }
      if ((ml_ordered_match_1.$ === "Some")) {
        return Object.freeze({ $: 'Err', field0: (() => {
      const ml_arm_ml_conversion_source_3_1 = "user must be a string";
      return ml_arm_ml_conversion_source_3_1;
    })() });
      }
      throw new Error("unreachable exhaustive ordered match");
    })();
  })();
}

function rp_7361666574795f6964656e7469666965722e616e7468726f7069635f757365725f6964(body) {
try {
  ml_pattern_immutable_view(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_host_serde_json_value_get_string(body, "metadata");
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0);
  }
  const metadata = (ml_pattern_1)["field0"];
  const ml_pattern_2 = ml_host_serde_json_value_as_object(metadata);
  if ((ml_pattern_immutable_view(ml_pattern_2) && (ml_pattern_2.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_conversion_source_3 = "metadata must be an object";
    return ml_conversion_source_3;
  })() });
  }
  const metadata_2 = (ml_pattern_2)["field0"];
  const ml_pattern_1_2 = ml_host_serde_json_map_get(metadata_2, "user_id");
  if ((ml_pattern_immutable_view(ml_pattern_1_2) && (ml_pattern_1_2.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0);
  }
  const identifier = (ml_pattern_1_2)["field0"];
  const ml_pattern_2_2 = ml_host_serde_json_value_as_str(identifier);
  if ((ml_pattern_immutable(ml_pattern_2_2) && (ml_pattern_2_2.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_conversion_source_3_2 = "metadata.user_id must be a string";
    return ml_conversion_source_3_2;
  })() });
  }
  const identifier_2 = (ml_pattern_2_2)["field0"];
  ml_router_try(rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169(Object.freeze({ $: 'Some', field0: identifier_2 })), false);
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'Some', field0: identifier_2 }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0);

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

export const translated = { ["OPENAI_MAX_CHARACTERS"]: rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253(), ["validate_openai"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169, ["validate_openai_value"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f76616c7565, ["validate_openai_user"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f75736572, ["validate_openai_user_value"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f757365725f76616c7565, ["anthropic_user_id"]: rp_7361666574795f6964656e7469666965722e616e7468726f7069635f757365725f6964 };
export const provenance = {"sourcePath":"rust/src/safety_identifier.rs","sourceSha256":"3fc317d7db138e9316e77a959f0e77a747cf9eba0ce805af20210e4035f19cca","executable":6,"executableFunctions":5,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":1,"preserved":8,"runtimeParity":false};
