type MLData_72705f353236663735373436353732346637303734363936663665356633313337356637323735373337343566366637373665363536343566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f3532366637353734363537323466373037343639366636653566333533343566373236353636363537323635366536333635356637333638363137323635363435663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f3532366637353734363537323532363537333735366337343566333435663735366536393734356633313337356637323735373337343566366637373665363536343566373337343732363936653637 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }>;
type MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739> }>;
type MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
// Generated draft from src/bridge_controls.rs; sha256=c4d0d6520eccf550be920e521860681172ffca2dc028fde5187434429d1f7b81
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_is_null as ml_host_serde_json_value_is_null, serde_json_value_get_string as ml_host_serde_json_value_get_string } from "../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy } from "../runtime/copy-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]}}};

import { assertImmutableIterator as ml_pattern_immutable_view } from "../runtime/iterator-runtime.mjs";

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_bool_then_some<T>(value: boolean, argument: T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function rp_6272696467655f636f6e74726f6c732e434841545f4649454c4453(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["model", "messages", "max_tokens", "max_completion_tokens", "temperature", "top_p", "frequency_penalty", "presence_penalty", "logit_bias", "seed", "stream", "stream_options", "stop", "tools", "tool_choice", "reasoning_effort", "reasoning", "response_format", "parallel_tool_calls", "n", "modalities", "audio", "logprobs", "top_logprobs", "safety_identifier", "service_tier", "prompt_cache_key", "prompt_cache_options", "prompt_cache_retention", "moderation", "prediction", "user"]));
}

function rp_6272696467655f636f6e74726f6c732e524553504f4e53455f4649454c4453(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["model", "input", "instructions", "max_output_tokens", "temperature", "top_p", "stream", "tools", "tool_choice", "reasoning", "text", "parallel_tool_calls", "background", "max_tool_calls", "truncation", "store", "stream_options", "safety_identifier", "previous_response_id", "conversation", "service_tier", "prompt_cache_key", "prompt_cache_options", "prompt_cache_retention", "moderation", "metadata", "include", "prompt", "user", "context_management", "top_logprobs"]));
}

function rp_6272696467655f636f6e74726f6c732e756e7472616e736c617461626c655f6d6f6465726174696f6e(value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }> {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  return ml_host_option_map((() => {
    const ml_standard_callback_self_1 = (() => { const ml_shared_immutable_value = value; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    return (() => {
    const ml_pattern_1 = ml_standard_callback_self_1;
    if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
      const ml_standard_pattern_2 = (ml_pattern_1)["field0"];
      if ((() => {
      const ml_standard_callback_arg_2 = ml_standard_pattern_2;
      const value_2 = ml_standard_callback_arg_2;
      return !ml_host_serde_json_value_is_null(value_2);
    })()) {
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_standard_pattern_2 }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67);
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })(), (_) => { return (() => {
    const ml_conversion_source_3 = "moderation cannot be represented by the selected provider";
    return ml_conversion_source_3;
  })(); });
}

function rp_6272696467655f636f6e74726f6c732e756e7472616e736c617461626c655f636861745f70726564696374696f6e(value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }> {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  return ml_host_option_map((() => {
    const ml_standard_callback_self_1 = (() => { const ml_shared_immutable_value = value; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    return (() => {
    const ml_pattern_1 = ml_standard_callback_self_1;
    if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
      const ml_standard_pattern_2 = (ml_pattern_1)["field0"];
      if ((() => {
      const ml_standard_callback_arg_2 = ml_standard_pattern_2;
      const value_2 = ml_standard_callback_arg_2;
      return !ml_host_serde_json_value_is_null(value_2);
    })()) {
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: ml_standard_pattern_2 }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_constructor_value_schema_29d733eba4a5e6f1b84f992cff81c67fc7370447788c0c9a2c733cb2257e3e67);
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })(), (_) => { return (() => {
    const ml_conversion_source_3 = "prediction cannot be represented by the selected provider";
    return ml_conversion_source_3;
  })(); });
}

function rp_6272696467655f636f6e74726f6c732e76616c69646174655f726573706f6e7365735f7265736f757263655f73656c6563746f7273(body: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> {
  ml_pattern_immutable_view(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if ((() => {
    const ml_standard_callback_self_1 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(body, "prompt"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_callback_self_1.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_2 = ml_standard_callback_self_1.field0;
        const ml_standard_callback_arg_1 = ml_standard_pattern_2;
        const value = ml_standard_callback_arg_1;
        return !ml_host_serde_json_value_is_null(value);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_1);
      }
    }
  })()) {
    return Object.freeze({ $: 'Err', field0: (() => {
    const ml_conversion_source_2 = "prompt templates cannot be resolved by the selected provider bridge";
    return ml_conversion_source_2;
  })() });
  } else {
  }
  return (() => {
    const ml_ordered_match_1 = ml_host_serde_json_value_get_string(body, "include");
    ml_pattern_immutable_view(ml_ordered_match_1);
    return (() => {
      if ((ml_ordered_match_1.$ === "None")) {
        return Object.freeze({ $: 'Ok', field0: null });
      }
      if (((ml_ordered_match_1.$ === "Some") && ((ml_ordered_match_1)["field0"].$ === "Null"))) {
        return Object.freeze({ $: 'Ok', field0: null });
      }
      if (((ml_ordered_match_1.$ === "Some") && ((ml_ordered_match_1)["field0"].$ === "Array"))) {
        const ml_guard_binding_2 = ((ml_ordered_match_1)["field0"])["field0"];
        if ((ml_guard_binding_2.length === 0)) return Object.freeze({ $: 'Ok', field0: null });
      }
      if (((ml_ordered_match_1.$ === "Some") && ((ml_ordered_match_1)["field0"].$ === "Array"))) {
        return Object.freeze({ $: 'Err', field0: (() => {
      const ml_arm_ml_conversion_source_3_1 = "include selectors cannot be represented by the selected provider";
      return ml_arm_ml_conversion_source_3_1;
    })() });
      }
      if ((ml_ordered_match_1.$ === "Some")) {
        return Object.freeze({ $: 'Err', field0: (() => {
      const ml_arm_ml_conversion_source_2_1 = "include must be an array";
      return ml_arm_ml_conversion_source_2_1;
    })() });
      }
      throw new Error("unreachable exhaustive ordered match");
    })();
  })();
}

export const translated: { "CHAT_FIELDS": ReadonlyArray<string>; "RESPONSE_FIELDS": ReadonlyArray<string>; "untranslatable_moderation": (value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>; "untranslatable_chat_prediction": (value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>; "validate_responses_resource_selectors": (body: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": string }> } = { ["CHAT_FIELDS"]: rp_6272696467655f636f6e74726f6c732e434841545f4649454c4453(), ["RESPONSE_FIELDS"]: rp_6272696467655f636f6e74726f6c732e524553504f4e53455f4649454c4453(), ["untranslatable_moderation"]: rp_6272696467655f636f6e74726f6c732e756e7472616e736c617461626c655f6d6f6465726174696f6e, ["untranslatable_chat_prediction"]: rp_6272696467655f636f6e74726f6c732e756e7472616e736c617461626c655f636861745f70726564696374696f6e, ["validate_responses_resource_selectors"]: rp_6272696467655f636f6e74726f6c732e76616c69646174655f726573706f6e7365735f7265736f757263655f73656c6563746f7273 };
export const provenance = {"sourcePath":"src/bridge_controls.rs","sourceSha256":"c4d0d6520eccf550be920e521860681172ffca2dc028fde5187434429d1f7b81","executable":5,"executableFunctions":3,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":14,"preserved":20,"runtimeParity":false};
