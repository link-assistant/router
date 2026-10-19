type MLData_72705f353236663735373436353732346637303734363936663665356633333566373533363334 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_72705f3532366637353734363537323466373037343639366636653566333533343566373236353636363537323635366536333635356637333638363137323635363435663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f353236663735373436353732353437353730366336353566333335663735333633343566333335663735333633343566373237353733373435663335363233373632333233323337333033373332333633393336363433363339333733343336333933373336333633353332333233333631333233323337333533333336333333343332333233373634333236333337363233323332333733303337333233363339333636343336333933373334333633393337333633363335333233323333363133323332333733353333333633333334333233323337363433353634 = Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint }>;
type MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739> }>;
type MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
// Generated draft from src/anthropic_stream.rs; sha256=fcd91d239af65a88e746f67d6f3c6c7888ae6d467bbc0a75825e02d93eebf6b0
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64 } from "../runtime/json-runtime.mjs";

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind<T,U>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>, mode:'and_then'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: ()=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, mode:'or_else'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>boolean, mode:'is_some_and'): boolean;
function ml_host_option_bind(value: { $: string; field0?: any }, operation: (...values: any[]) => any, mode: string) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_616e7468726f7069635f73747265616d2e6d61705f73746f705f726561736f6e(finish_reason: string): string {
  if (!(typeof finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if ((finish_reason === "length")) {
    return "max_tokens";
  } else {
    if ((finish_reason === "max_tokens")) {
      return "max_tokens";
    } else {
      if ((finish_reason === "max_output_tokens")) {
        return "max_tokens";
      } else {
        if ((finish_reason === "tool_calls")) {
          return "tool_use";
        } else {
          if ((finish_reason === "function_call")) {
            return "tool_use";
          } else {
            if ((finish_reason === "tool_use")) {
              return "tool_use";
            } else {
              return "end_turn";
            }
          }
        }
      }
    }
  }
}

function rp_616e7468726f7069635f73747265616d2e726573706f6e73655f636f6e74656e745f6b6579(event: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint }> {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return Object.freeze({ $: 'Tuple', field0: (() => {
    const ml_standard_body_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(event, "output_index"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0); }, "and_then") as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
    const ml_standard_body_3 = 0n;
    switch (ml_standard_body_2.$) {
      case "None": {
        return ml_standard_body_3;
      }
      case "Some": {
        const x = ml_standard_body_2.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2);
      }
    }
  })(), field1: (() => {
    const ml_standard_body_2_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(event, "content_index"), (ml_host_callback_0_0_2) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0_2); }, "and_then") as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
    const ml_standard_body_3_2 = 0n;
    switch (ml_standard_body_2_2.$) {
      case "None": {
        return ml_standard_body_3_2;
      }
      case "Some": {
        const x_2 = ml_standard_body_2_2.field0;
        return x_2;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2_2);
      }
    }
  })() });
}

export const translated: { "map_stop_reason": (finish_reason: string) => string; "response_content_key": (event: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint }> } = { ["map_stop_reason"]: rp_616e7468726f7069635f73747265616d2e6d61705f73746f705f726561736f6e, ["response_content_key"]: rp_616e7468726f7069635f73747265616d2e726573706f6e73655f636f6e74656e745f6b6579 };
export const provenance = {"sourcePath":"src/anthropic_stream.rs","sourceSha256":"fcd91d239af65a88e746f67d6f3c6c7888ae6d467bbc0a75825e02d93eebf6b0","executable":2,"executableFunctions":2,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":12,"runtimeParity":false};
