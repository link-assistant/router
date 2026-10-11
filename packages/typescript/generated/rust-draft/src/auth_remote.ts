type MLData_72705f35323666373537343635373234663730373436393666366535663333333735663665363136643635363435663337333333363335333733323336333433363335333536363336363133373333333636363336363535663335333633363331333636333337333533363335 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f3733363537323634363535663661373336663665326535363631366337353635 }>;
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

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../runtime/json-runtime.mjs";

function ml_router_unwrap(value: any, fallback: any, option: boolean) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value: { $: string; field0?: any }, operation: (...values: any[]) => any, mode: string) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_617574685f72656d6f74652e524551554553545f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(30n);
}

function rp_617574685f72656d6f74652e7374617475735f6f66(view: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635): string {
  ml_validate_rust_value(view, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(view, "status"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_2_0); }, "and_then"), "unknown", true);
}

export const translated: { "REQUEST_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "status_of": (view: MLData_72705f3733363537323634363535663661373336663665326535363631366337353635) => string } = { ["REQUEST_TIMEOUT"]: rp_617574685f72656d6f74652e524551554553545f54494d454f5554(), ["status_of"]: rp_617574685f72656d6f74652e7374617475735f6f66 };
export const provenance = {"sourcePath":"src/auth_remote.rs","sourceSha256":"10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":27,"preserved":30,"runtimeParity":false};
