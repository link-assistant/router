type MLData_72705f353236663735373436353732346637303734363936663665356633313337356637323735373337343566366637373665363536343566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f3532366637353734363537323466373037343639366636653566333533343566373236353636363537323635366536333635356637333638363137323635363435663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f3532366637353734363537323466373037343639366636653566333633393566373236353636363537323635366536333635356637333638363137323635363435663732373537333734356636663737366536353634356637363635363335663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739> }>;
type MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from src/auth_remote.rs; sha256=10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../runtime/json-runtime.mjs";

function ml_router_unwrap<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>|Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:unknown}>, fallback: T, option: boolean): T {
  if (option) {
    if (value.$ === 'Some') return value.field0;
  } else if (value.$ === 'Ok') return value.field0;
  return fallback;
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind<T,U>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>, mode:'and_then'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: ()=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, mode:'or_else'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>boolean, mode:'is_some_and'): boolean;
function ml_host_option_bind(value: { $: string; field0?: any }, operation: (...values: any[]) => any, mode: string) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../runtime/iterator-runtime.mjs";

function ml_router_iter<T>(values: ReadonlyArray<T>, immutable: boolean): ArrayIterator<T> { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function* ml_router_filter_map<T, U>(values: Iterable<T>, transform: (value: T) => Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>): IterableIterator<U> { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function* ml_router_flatten<T>(values: Iterable<ReadonlyArray<T>>): IterableIterator<T> { for (const value of values) { ml_assert_immutable_iterator(value); yield* Array.prototype.values.call(value); } }

function ml_router_find<T>(values: Iterable<T>, predicate: (value: T) => boolean): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { for (const value of values) if (predicate(value)) return Object.freeze({ $: "Some", field0: value }); return Object.freeze({ $: "None" }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_617574685f72656d6f74652e524551554553545f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(30n);
}

function rp_617574685f72656d6f74652e504f4c4c5f494e54455256414c(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(3n);
}

function rp_617574685f72656d6f74652e7374617475735f6f66(view: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): string {
  ml_validate_rust_value(view, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(view, "status"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_2_0); }, "and_then"), "unknown", true);
}

function rp_617574685f72656d6f74652e686f6d655f696e5f6163636f756e7473(body: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635, provider: string): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }> {
  ml_assert_immutable_iterator(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof provider === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider))) throw new TypeError('argument outside supported Rust value domain');
  return ml_host_option_map(ml_host_option_bind(ml_router_find(ml_router_flatten(ml_router_filter_map(ml_router_iter(ml_copy_fixed_array(["credentials", "accounts"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":2}}), false), (key) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(body, key), (ml_host_callback_8_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_8_0); }, "and_then"); })), (entry) => { return ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(entry, "name"), (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_9_0); }, "and_then"), (name) => { return ((name).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)) === (provider).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))); }, "is_some_and"); }), (entry_2) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(entry_2, "home"), (ml_host_callback_10_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_10_0); }, "and_then"); }, "and_then"), (ml_standard_callback_11_0) => { return ml_standard_callback_11_0; });
}

export const translated: { "REQUEST_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "POLL_INTERVAL": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "status_of": (view: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => string; "home_in_accounts": (body: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635, provider: string) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }> } = { ["REQUEST_TIMEOUT"]: rp_617574685f72656d6f74652e524551554553545f54494d454f5554(), ["POLL_INTERVAL"]: rp_617574685f72656d6f74652e504f4c4c5f494e54455256414c(), ["status_of"]: rp_617574685f72656d6f74652e7374617475735f6f66, ["home_in_accounts"]: rp_617574685f72656d6f74652e686f6d655f696e5f6163636f756e7473 };
export const provenance = {"sourcePath":"src/auth_remote.rs","sourceSha256":"10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f","executable":4,"executableFunctions":2,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":25,"preserved":30,"runtimeParity":false};
