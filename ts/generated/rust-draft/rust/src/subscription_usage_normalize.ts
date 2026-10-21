type MLData_72705f353236663735373436353732346637303734363936663665356633333566373533363334 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_72705f3532366637353734363537323466373037343639366636653566333533343566373236353636363537323635366536333635356637333638363137323635363435663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f35323666373537343635373234663730373436393666366535663335356636363663366636313734 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": number }>;
type MLData_72705f3532366637353734363537323466373037343639366636653566333633393566373236353636363537323635366536333635356637333638363137323635363435663732373537333734356636663737366536353634356637363635363335663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f35323666373537343635373234663730373436393666366535663337333635663732363536363635373236353665363336353566373336383631373236353634356636653631366436353634356633373333333633353337333233363334333633353335363633363631333733333336363633363635356633343634333633313337333033353636333533333337333433373332333633393336363533363337333536363335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
type MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739> }>;
type MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
// Generated draft from rust/src/subscription_usage_normalize.rs; sha256=e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_f64 as ml_host_serde_json_value_as_f64, serde_json_value_as_object as ml_host_serde_json_value_as_object, serde_json_map_get as ml_host_serde_json_map_get, serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../../runtime/json-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view, assertImmutableIterator as ml_assert_immutable_iterator } from "../../runtime/iterator-runtime.mjs";

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind<T,U>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>, mode:'and_then'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: ()=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, mode:'or_else'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>boolean, mode:'is_some_and'): boolean;
function ml_host_option_bind(value: { $: string; field0?: any }, operation: (...values: any[]) => any, mode: string) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from "../../runtime/fixed-integer-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable, assertImmutableCopy as ml_assert_immutable_copy } from "../../runtime/copy-runtime.mjs";

function ml_router_iter<T>(values: ReadonlyArray<T>, immutable: boolean): ArrayIterator<T> { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function* ml_router_filter_map<T, U>(values: Iterable<T>, transform: (value: T) => Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>): IterableIterator<U> { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_collect<T>(values: Iterable<T>) { return Object.freeze(Array.from(values)); }

function ml_router_fold<T, A>(values: Iterable<T>, initial: A, combine: (accumulator: A, value: T) => A) { let result = initial; for (const value of values) result = combine(result, value); return result; }

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

function ml_host_bool_then_some<T>(value: boolean, argument: T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

const ml_host_rust_fixed_saturating_add_u64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_fixed_saturating_add;

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e414e5448524f5049435f57494e444f5753(): ReadonlyArray<string> & { readonly length: 6 } {
  return ml_copy_fixed_array(["five_hour", "seven_day", "seven_day_oauth_apps", "seven_day_opus", "seven_day_sonnet", "cinder_cove"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":6}});
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e7265636f676e697a61626c655f616e7468726f7069635f6c696d6974(value: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): boolean {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_host_serde_json_value_as_object(value) as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return false;
  }
  const limit = (ml_pattern_1)["field0"];
  return ((((ml_host_option_bind(ml_host_serde_json_map_get(limit, "kind"), (ml_host_callback_3_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_3_0); }, "and_then").$ === 'Some') || (ml_host_option_bind(ml_host_serde_json_map_get(limit, "group"), (ml_host_callback_6_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_6_0); }, "and_then").$ === 'Some')) || (ml_host_option_bind(ml_host_serde_json_value_pointer(value, "/scope/model/display_name"), (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_9_0); }, "and_then").$ === 'Some')) && ((ml_host_option_bind(ml_host_serde_json_map_get(limit, "percent"), (ml_host_callback_12_0) => { return ml_host_serde_json_value_as_f64(ml_host_callback_12_0); }, "and_then").$ === 'Some') || (ml_host_option_bind(ml_host_serde_json_map_get(limit, "resets_at"), (ml_host_callback_15_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_15_0); }, "and_then").$ === 'Some')));
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e6e756d657269635f6d6573736167655f657374696d617465(value: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> {
try {
  ml_assert_immutable_iterator(value);
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_host_serde_json_value_as_u64(value) as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
  if ((ml_pattern_immutable(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
    const count = (ml_pattern_1)["field0"];
    return Object.freeze({ $: 'Some', field0: count });
  } else {
  }
  const values = ml_router_try(ml_host_serde_json_value_as_array(value), true);
  const counts = ml_router_collect(ml_router_filter_map(ml_router_iter(values, true), (entry) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(entry, "count"), (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_9_0); }, "and_then"); }));
  return ml_host_bool_then(!(counts.length === 0), () => { return ml_router_fold(ml_router_iter(counts, false), 0n, (ml_standard_callback_10_0, ml_standard_callback_11_1) => { return ml_host_rust_fixed_saturating_add_u64(ml_standard_callback_10_0, ml_standard_callback_11_1); }); });

} catch (ml_router_error: any) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e72657365745f637265646974735f617661696c61626c65(value: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_host_option_bind(ml_host_option_bind((() => {
    const ml_standard_body_2 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(value, "rate_limit_reset_credits"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })() as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
    switch (ml_standard_body_2.$) {
      case "None": {
        const ml_standard_capture_domain_1 = (() => { const ml_shared_immutable_value = value; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })() as MLData_72705f3733363537323634363535663661373336663665326535363631366337353635;
        return ml_host_serde_json_value_get_string(value, "rate_limit_reset_credits_summary");
      }
      case "Some": {
        const ml_standard_alias_field = ml_standard_body_2.field0;
        const x = ml_standard_body_2 as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2);
      }
    }
  })(), (credits) => { return ml_host_serde_json_value_get_string(credits, "available_count"); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0); }, "and_then");
}

export const translated: { "ANTHROPIC_WINDOWS": ReadonlyArray<string> & { readonly length: 6 }; "recognizable_anthropic_limit": (value: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => boolean; "numeric_message_estimate": (value: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>; "reset_credits_available": (value: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> } = { ["ANTHROPIC_WINDOWS"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e414e5448524f5049435f57494e444f5753(), ["recognizable_anthropic_limit"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e7265636f676e697a61626c655f616e7468726f7069635f6c696d6974, ["numeric_message_estimate"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e6e756d657269635f6d6573736167655f657374696d617465, ["reset_credits_available"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e72657365745f637265646974735f617661696c61626c65 };
export const provenance = {"sourcePath":"rust/src/subscription_usage_normalize.rs","sourceSha256":"e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad","executable":4,"executableFunctions":3,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":30,"preserved":34,"runtimeParity":false};
