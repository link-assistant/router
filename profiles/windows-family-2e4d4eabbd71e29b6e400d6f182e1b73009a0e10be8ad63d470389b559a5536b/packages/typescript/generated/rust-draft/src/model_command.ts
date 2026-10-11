type MLData_72705f3532366637353734363537323466373037343639366636653566333533343566373236353636363537323635366536333635356637333638363137323635363435663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f3532366637353734363537323534373537303663363535663336356637333734373236393665363735663336333935663665363136643635363435663336363433363636333633343336333533363633333536363336333333363636333636353337333433373332333633313336333333373334356633343634333636363336333433363335333636333335333333363335333636333336333533363333333733343336363633373332333436323336333933363635333633343566373237353733373435663335363233373632333233323337333333363636333733353337333233363333333633353334363633373337333636353336333533373332333733333336333833363339333733303332333233333631333736323332333233363632333633393336363533363334333233323333363133323332333633323336363633373332333733323336363633373337333633353336333433323332333236333332333233373333333636363337333533373332333633333336333533323332333336313332333233373333333733343337333233323332333736343337363433323633333736323337363433353634 = Readonly<{ readonly "$": "Tuple"; readonly "field0": string; readonly "field1": MLData_72705f36643666363436353663356636333666366537343732363136333734326534643666363436353663353336353663363536333734366637323462363936653634 }>;
type MLData_72705f36643666363436353663356636333666366537343732363136333734326534643666363436353663353336353663363536333734366637323462363936653634 = Readonly<{ readonly "$": "Concrete" }> | Readonly<{ readonly "$": "ProviderDynamicAlias" }> | Readonly<{ readonly "$": "OperatorAlias" }> | Readonly<{ readonly "$": "Unknown" }>;
type MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
type MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326534643631373034353665373437323739> }>;
type MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_72705f37333635373236343635356636613733366636653265346537353664363236353732 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_72705f3733363537323634363535663661373336663665326535363631366337353635> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_72705f373336353732363436353566366137333666366532653464363137303566353337343732363936653637356635363631366337353635 }>;
// Generated draft from src/model_command.rs; sha256=21d3edf828cb481555d8f3afebd5bb556de79ce7dc1ddce93b9bed376afd510e
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../runtime/json-runtime.mjs";

function ml_router_unwrap<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>|Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:unknown}>, fallback: T, option: boolean): T {
  if (option) {
    if (value.$ === 'Some') return value.field0;
  } else if (value.$ === 'Ok') return value.field0;
  return fallback;
}

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind<T,U>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>, mode:'and_then'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: ()=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, mode:'or_else'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>boolean, mode:'is_some_and'): boolean;
function ml_host_option_bind(value: { $: string; field0?: any }, operation: (...values: any[]) => any, mode: string) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_6d6f64656c5f636f6d6d616e642e73656c6563746f725f6b696e64(entry: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>): Readonly<{ readonly "$": "Tuple"; readonly "field0": string; readonly "field1": Readonly<{ readonly "$": "Concrete" }> | Readonly<{ readonly "$": "ProviderDynamicAlias" }> | Readonly<{ readonly "$": "OperatorAlias" }> | Readonly<{ readonly "$": "Unknown" }> }> {
  ml_validate_rust_value(entry, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const label = ml_router_unwrap(ml_host_option_bind(ml_host_option_bind(entry, (value) => { return ml_host_serde_json_value_get_string(value, "selector_kind"); }, "and_then"), (ml_host_callback_8_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_8_0); }, "and_then"), "unknown", true);
  const kind = rp_6d6f64656c5f636f6e74726163742e6d6c5f696d706c5f363337323631373436353265366436663634363536633566363336663665373437323631363337343265346436663634363536633533363536633635363337343666373234623639366536345f363637323666366435663737363937323635(label);
  return Object.freeze({ $: 'Tuple', field0: label, field1: kind });
}

function rp_6d6f64656c5f636f6e74726163742e6d6c5f696d706c5f363337323631373436353265366436663634363536633566363336663665373437323631363337343265346436663634363536633533363536633635363337343666373234623639366536345f363637323666366435663737363937323635(value: string): Readonly<{ readonly "$": "Concrete" }> | Readonly<{ readonly "$": "ProviderDynamicAlias" }> | Readonly<{ readonly "$": "OperatorAlias" }> | Readonly<{ readonly "$": "Unknown" }> {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  if ((value === "provider_dynamic_alias")) {
    return Object.freeze({ $: 'ProviderDynamicAlias' });
  } else {
    if ((value === "provider_advertised_alias")) {
      return Object.freeze({ $: 'ProviderDynamicAlias' });
    } else {
      if ((value === "operator_alias")) {
        return Object.freeze({ $: 'OperatorAlias' });
      } else {
        if ((value === "concrete")) {
          return Object.freeze({ $: 'Concrete' });
        } else {
          if ((value === "provider_advertised_exact_id")) {
            return Object.freeze({ $: 'Concrete' });
          } else {
            return Object.freeze({ $: 'Unknown' });
          }
        }
      }
    }
  }
}

export const translated: { "selector_kind": (entry: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>) => Readonly<{ readonly "$": "Tuple"; readonly "field0": string; readonly "field1": Readonly<{ readonly "$": "Concrete" }> | Readonly<{ readonly "$": "ProviderDynamicAlias" }> | Readonly<{ readonly "$": "OperatorAlias" }> | Readonly<{ readonly "$": "Unknown" }> }> } = { ["selector_kind"]: rp_6d6f64656c5f636f6d6d616e642e73656c6563746f725f6b696e64 };
export const provenance = {"sourcePath":"src/model_command.rs","sourceSha256":"21d3edf828cb481555d8f3afebd5bb556de79ce7dc1ddce93b9bed376afd510e","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":17,"runtimeParity":false};
