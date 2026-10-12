type MLData_72705f353236663735373436353732346637303734363936663665356633333566373533363334 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_72705f3532366637353734363537323466373037343639366636653566333533343566373236353636363537323635366536333635356637333638363137323635363435663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f353236663735373436353732353437353730366336353566333335663735333633343566333335663735333633343566373237353733373435663335363233373632333233323337333033373332333633393336363433363339333733343336333933373336333633353332333233333631333233323337333533333336333333343332333233373634333236333337363233323332333733303337333233363339333636343336333933373334333633393337333633363335333233323333363133323332333733353333333633333334333233323337363433353634 = Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint }>;
type MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739> }>;
type MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
// Generated draft from src/responses.rs; sha256=5d00fae1c3f24e678c460381c58f0bc746435910655109d8d4ce2609a01ffea0
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64 } from "../runtime/json-runtime.mjs";

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

import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function* ml_router_filter_map<T, U>(values: Iterable<T>, transform: (value: T) => Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>): IterableIterator<U> { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_collect<T>(values: Iterable<T>) { return Object.freeze(Array.from(values)); }

function ml_host_bool_then_some<T>(value: boolean, argument: T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_726573706f6e7365732e73747265616d5f636f6e74656e745f6b6579(event: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint }> {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return Object.freeze({ $: 'Tuple', field0: ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "output_index"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_2_0); }, "and_then"), 0n, true), field1: ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "content_index"), (ml_host_callback_5_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_5_0); }, "and_then"), 0n, true) });
}

function rp_726573706f6e7365732e657874726163745f7373655f64617461(block: string): string {
  if (!(typeof block === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(block))) throw new TypeError('argument outside supported Rust value domain');
  return ml_str_join(ml_router_collect(ml_router_filter_map(ml_str_lines(block), (line) => { return ml_host_option_map((() => {
    const ml_text_25 = (() => {
      const ml_text_23 = line;
      const ml_text_24 = "\r";
      return (()=>{let text=ml_text_23;if(ml_text_24.length===0)return text;while(text.endsWith(ml_text_24))text=text.slice(0,text.length-ml_text_24.length);return text;})();
    })();
    const ml_text_26 = "data:";
    return (ml_text_25.startsWith(ml_text_26)?Object.freeze({ $: 'Some', field0: ml_text_25.slice(ml_text_26.length) }):Object.freeze({ $: 'None' }));
  })(), (ml_standard_callback_26_0) => { return (ml_standard_callback_26_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ''); }); })), "\n");
}

function rp_726573706f6e7365732e646f6e655f6672616d65(): string {
  return "data: [DONE]\n\n";
}

export const translated: { "stream_content_key": (event: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint }>; "extract_sse_data": (block: string) => string; "done_frame": () => string } = { ["stream_content_key"]: rp_726573706f6e7365732e73747265616d5f636f6e74656e745f6b6579, ["extract_sse_data"]: rp_726573706f6e7365732e657874726163745f7373655f64617461, ["done_frame"]: rp_726573706f6e7365732e646f6e655f6672616d65 };
export const provenance = {"sourcePath":"src/responses.rs","sourceSha256":"5d00fae1c3f24e678c460381c58f0bc746435910655109d8d4ce2609a01ffea0","executable":3,"executableFunctions":3,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":18,"preserved":22,"runtimeParity":false};
