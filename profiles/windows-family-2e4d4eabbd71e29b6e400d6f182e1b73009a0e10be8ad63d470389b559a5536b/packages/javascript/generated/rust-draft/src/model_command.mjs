// Generated draft from src/model_command.rs; sha256=21d3edf828cb481555d8f3afebd5bb556de79ce7dc1ddce93b9bed376afd510e
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../runtime/json-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_d14d28ce0e1e0b5e38c6208f540dff3b28dd559da3783fcb8dc017b4551d3ae5 = {"schemaVersion":1,"types":{"rp_526f757465725475706c655f365f737472696e675f36395f6e616d65645f366436663634363536633566363336663665373437323631363337345f346436663634363536633533363536633635363337343666373234623639366536345f727573745f35623762323237333666373537323633363534663737366536353732373336383639373032323361376232323662363936653634323233613232363236663732373236663737363536343232326332323733366637353732363336353232336132323733373437323232376437643263376237643564":{"kind":"data","name":"rp_526f757465725475706c655f365f737472696e675f36395f6e616d65645f366436663634363536633566363336663665373437323631363337345f346436663634363536633533363536633635363337343666373234623639366536345f727573745f35623762323237333666373537323633363534663737366536353732373336383639373032323361376232323662363936653634323233613232363236663732373236663737363536343232326332323733366637353732363336353232336132323733373437323232376437643263376237643564","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"data","name":"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64"}}]}]},"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64":{"kind":"data","name":"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64","ctors":[{"name":"Concrete","fields":[]},{"name":"ProviderDynamicAlias","fields":[]},{"name":"OperatorAlias","fields":[]},{"name":"Unknown","fields":[]}]}}};

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_6d6f64656c5f636f6d6d616e642e73656c6563746f725f6b696e64(entry) {
  ml_validate_rust_value(entry, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const label = (() => {
    const ml_standard_body_2 = ml_host_option_bind(ml_host_option_bind(entry, (value) => { return ml_host_serde_json_value_get_string(value, "selector_kind"); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
    const ml_standard_body_3 = "unknown";
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
  })();
  const kind = rp_6d6f64656c5f636f6e74726163742e6d6c5f696d706c5f363337323631373436353265366436663634363536633566363336663665373437323631363337343265346436663634363536633533363536633635363337343666373234623639366536345f363637323666366435663737363937323635(label);
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Tuple', field0: label, field1: kind }), {"kind":"data","name":"rp_526f757465725475706c655f365f737472696e675f36395f6e616d65645f366436663634363536633566363336663665373437323631363337345f346436663634363536633533363536633635363337343666373234623639366536345f727573745f35623762323237333666373537323633363534663737366536353732373336383639373032323361376232323662363936653634323233613232363236663732373236663737363536343232326332323733366637353732363336353232336132323733373437323232376437643263376237643564"}, ml_constructor_value_schema_d14d28ce0e1e0b5e38c6208f540dff3b28dd559da3783fcb8dc017b4551d3ae5);
}

function rp_6d6f64656c5f636f6e74726163742e6d6c5f696d706c5f363337323631373436353265366436663634363536633566363336663665373437323631363337343265346436663634363536633533363536633635363337343666373234623639366536345f363637323666366435663737363937323635(value) {
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

export const translated = { ["selector_kind"]: rp_6d6f64656c5f636f6d6d616e642e73656c6563746f725f6b696e64 };
export const provenance = {"sourcePath":"src/model_command.rs","sourceSha256":"21d3edf828cb481555d8f3afebd5bb556de79ce7dc1ddce93b9bed376afd510e","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":17,"runtimeParity":false};
