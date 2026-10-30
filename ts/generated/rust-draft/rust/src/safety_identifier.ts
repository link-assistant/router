type MLData_72705f3532366637353734363537323466373037343639366636653566333533343566373236353636363537323635366536333635356637333638363137323635363435663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f35323666373537343635373234663730373436393666366535663337333635663732363536363635373236353665363336353566373336383631373236353634356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633343634333633313337333033353636333533333337333433373332333633393336363533363337333536363335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
type MLData_72705f3532366637353734363537323532363537333735366337343566333433383566366536313664363536343566333533323336363633373335333733343336333533373332333436363337333033373334333633393336363633363635333536363333333633353636333733333337333433373332333633393336363533363337356633313337356637323735373337343566366637373665363536343566373337343732363936653637 = Readonly<{ readonly "$": "Ok"; readonly "field0": MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>;
type MLData_72705f3532366637353734363537323532363537333735366337343566333435663735366536393734356633313337356637323735373337343566366637373665363536343566373337343732363936653637 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>;
type MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739> }>;
type MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
// Generated draft from rust/src/safety_identifier.rs; sha256=96c304e61910ab4187f4e488ad74a9db329904cd0c03b45e5b13e1a8e235d1c4
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { router_core_unicode_scalar_count as ml_host_router_core_unicode_scalar_count } from "../../runtime/string-iterator-runtime.mjs";

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_is_null as ml_host_serde_json_value_is_null, serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_object as ml_host_serde_json_value_as_object, serde_json_map_get as ml_host_serde_json_map_get } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view } from "../../runtime/iterator-runtime.mjs";

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0 = {"schemaVersion":1,"types":{"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"Ok","fields":[{"name":"field0","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}}]},{"name":"Err","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_router_try_return = Symbol('checked Rust early return');
function ml_router_try<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, option:true): T;
function ml_router_try<R extends Readonly<{$:'Err';field0:unknown}>|Readonly<{$:'Ok';field0:unknown}>>(value: R, option:false): Extract<R,Readonly<{$:'Ok';field0:unknown}>>['field0'];
function ml_router_try<T, E>(value: Readonly<{$:'Some'|'Ok';field0:T}>|Readonly<{$:'None'}>|Readonly<{$:'Err';field0:E}>, option: boolean): T {
  if (option) {
    if (value.$ === 'Some') return value.field0;
    if (value.$ === 'None') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'None' }) };
  } else {
    if (value.$ === 'Ok') return value.field0;
    if (value.$ === 'Err') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'Err', field0: value.field0 }) };
  }
  throw new TypeError('checked Rust ? operand does not match its standard Option/Result mode');
}
function ml_router_propagated(error: any) { return error && error[ml_router_try_return] === true; }

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253(): bigint {
  return 64n;
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169(identifier: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>): Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> {
  ml_validate_rust_value(identifier, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  if ((() => {
    const ml_standard_callback_self_1 = identifier as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
    switch (ml_standard_callback_self_1.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_2 = ml_standard_callback_self_1.field0;
        const ml_standard_callback_arg_3 = ml_standard_pattern_2;
        const value = ml_standard_callback_arg_3;
        return (ml_host_router_core_unicode_scalar_count(value) > rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253());
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_1);
      }
    }
  })()) {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_4 = rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253();
    return (("safety_identifier must contain at most " + String(ml_fmt_4)) + " characters");
  })() });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f76616c7565(value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>): Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const ml_pattern_1 = value as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Ok', field0: null });
  }
  const value_2 = (ml_pattern_1)["field0"] as MLData_72705f3733363537323634363535663661373336663665326535363631366337353635;
  if (ml_host_serde_json_value_is_null(value_2)) {
    return Object.freeze({ $: 'Ok', field0: null });
  } else {
  }
  const ml_pattern_2 = ml_host_serde_json_value_as_str(value_2) as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
  if ((ml_pattern_immutable(ml_pattern_2) && (ml_pattern_2.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_conversion_source_3 = "safety_identifier must be a string";
    return ml_conversion_source_3;
  })() });
  }
  const identifier = (ml_pattern_2)["field0"];
  return rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169(Object.freeze({ $: 'Some', field0: identifier }));
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f75736572(user: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>): Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> {
  ml_validate_rust_value(user, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  if ((() => {
    const ml_standard_callback_self_1 = user as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
    switch (ml_standard_callback_self_1.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_2 = ml_standard_callback_self_1.field0;
        const ml_standard_callback_arg_3 = ml_standard_pattern_2;
        const value = ml_standard_callback_arg_3;
        return (ml_host_router_core_unicode_scalar_count(value) > rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253());
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_1);
      }
    }
  })()) {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_fmt_4 = rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253();
    return (("user must contain at most " + String(ml_fmt_4)) + " characters");
  })() });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
}

function rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f757365725f76616c7565(value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>): Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const ml_pattern_1 = value as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Ok', field0: null });
  }
  const value_2 = (ml_pattern_1)["field0"] as MLData_72705f3733363537323634363535663661373336663665326535363631366337353635;
  if (ml_host_serde_json_value_is_null(value_2)) {
    return Object.freeze({ $: 'Ok', field0: null });
  } else {
  }
  const ml_pattern_2 = ml_host_serde_json_value_as_str(value_2) as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
  if ((ml_pattern_immutable(ml_pattern_2) && (ml_pattern_2.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_conversion_source_3 = "user must be a string";
    return ml_conversion_source_3;
  })() });
  }
  const user = (ml_pattern_2)["field0"];
  return rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f75736572(Object.freeze({ $: 'Some', field0: user }));
}

function rp_7361666574795f6964656e7469666965722e616e7468726f7069635f757365725f6964(body: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): Readonly<{ readonly "$": "Ok"; readonly "field0": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }> }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> {
try {
  ml_pattern_immutable_view(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_host_serde_json_value_get_string(body, "metadata") as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0);
  }
  const metadata = (ml_pattern_1)["field0"] as MLData_72705f3733363537323634363535663661373336663665326535363631366337353635;
  const ml_pattern_2 = ml_host_serde_json_value_as_object(metadata) as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
  if ((ml_pattern_immutable_view(ml_pattern_2) && (ml_pattern_2.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_conversion_source_3 = "metadata must be an object";
    return ml_conversion_source_3;
  })() });
  }
  const metadata_2 = (ml_pattern_2)["field0"];
  const ml_pattern_4 = ml_host_serde_json_map_get(metadata_2, "user_id") as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
  if ((ml_pattern_immutable_view(ml_pattern_4) && (ml_pattern_4.$ === "Some"))) {
  } else {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'None' }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0);
  }
  const identifier = (ml_pattern_4)["field0"] as MLData_72705f3733363537323634363535663661373336663665326535363631366337353635;
  const ml_pattern_5 = ml_host_serde_json_value_as_str(identifier) as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
  if ((ml_pattern_immutable(ml_pattern_5) && (ml_pattern_5.$ === "Some"))) {
  } else {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_conversion_source_6 = "metadata.user_id must be a string";
    return ml_conversion_source_6;
  })() });
  }
  const identifier_2 = (ml_pattern_5)["field0"];
  ml_router_try(rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169(Object.freeze({ $: 'Some', field0: identifier_2 })), false);
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Ok', field0: Object.freeze({ $: 'Some', field0: identifier_2 }) }), {"kind":"data","name":"rp_526f75746572526573756c745f34385f6e616d65645f3532366637353734363537323466373037343639366636653566333635663733373437323639366536375f31375f727573745f6f776e65645f737472696e67"}, ml_constructor_value_schema_615da3b64c69b300d7f130d12543df0835d03d77e67169abc18743ecbfd527c0);

} catch (ml_router_error: any) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

export const translated: { "OPENAI_MAX_CHARACTERS": bigint; "validate_openai": (identifier: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>; "validate_openai_value": (value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>; "validate_openai_user": (user: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>; "validate_openai_user_value": (value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>; "anthropic_user_id": (body: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => Readonly<{ readonly "$": "Ok"; readonly "field0": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }> }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> } = { ["OPENAI_MAX_CHARACTERS"]: rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253(), ["validate_openai"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e6169, ["validate_openai_value"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f76616c7565, ["validate_openai_user"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f75736572, ["validate_openai_user_value"]: rp_7361666574795f6964656e7469666965722e76616c69646174655f6f70656e61695f757365725f76616c7565, ["anthropic_user_id"]: rp_7361666574795f6964656e7469666965722e616e7468726f7069635f757365725f6964 };
export const provenance = {"sourcePath":"rust/src/safety_identifier.rs","sourceSha256":"96c304e61910ab4187f4e488ad74a9db329904cd0c03b45e5b13e1a8e235d1c4","executable":6,"executableFunctions":5,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":1,"preserved":8,"runtimeParity":false};
