// Generated draft from rust/src/with_command_codex_catalog.rs; sha256=48264a8549e559f62a3259c41162fd19ec29311fe29fd0ef4505c604397b890b
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy } from "../../runtime/copy-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_6e817ec55fa8f45ca54ad6af4f52b3c6eb27d9ef1456c81b8c53ffca8c1e6f55 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f3130385f7265666572656e63655f7368617265645f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663":{"kind":"data","name":"rp_526f757465724f7074696f6e5f3130385f7265666572656e63655f7368617265645f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c"}}}]}]},"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c","ctors":[{"name":"RouterReasoningLevel","fields":[{"name":"effort","type":{"kind":"string"}},{"name":"description","type":{"kind":"string"}}]}]}}};

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

const ml_host_value_schema_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_526f757465724f7074696f6e5f335f693634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"rp_526f757465724f7074696f6e5f38325f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f34333663363137353634363534643666363436353663343336313730363136323639366336393734363936353733":{"kind":"data","name":"rp_526f757465724f7074696f6e5f38325f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f34333663363137353634363534643666363436353663343336313730363136323639366336393734363936353733","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e436c617564654d6f64656c4361706162696c6974696573"}}]}]},"rp_526f757465724f7074696f6e5f39315f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663":{"kind":"data","name":"rp_526f757465724f7074696f6e5f39315f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c"}}}]}]},"rp_636c69656e74732e636174616c6f672e436c617564654d6f64656c4361706162696c6974696573":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e436c617564654d6f64656c4361706162696c6974696573","ctors":[{"name":"ClaudeModelCapabilities","fields":[{"name":"behaves_as","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}}]}]},"rp_636c69656e74732e636174616c6f672e526f75746572436c69656e744361706162696c6974696573":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572436c69656e744361706162696c6974696573","ctors":[{"name":"RouterClientCapabilities","fields":[{"name":"claude","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f38325f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f34333663363137353634363534643666363436353663343336313730363136323639366336393734363936353733"}}]}]},"rp_636c69656e74732e636174616c6f672e526f757465724d6f64656c":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f757465724d6f64656c","ctors":[{"name":"RouterModel","fields":[{"name":"id","type":{"kind":"string"}},{"name":"owned_by","type":{"kind":"string"}},{"name":"selector_kind","type":{"kind":"data","name":"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64"}},{"name":"capability_provenance","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}},{"name":"default_reasoning_level","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"provider_created_at","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634"}},{"name":"supported_reasoning_levels","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f39315f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663"}},{"name":"client_capabilities","type":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572436c69656e744361706162696c6974696573"}},{"name":"router_unavailable_reason","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}}]}]},"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c","ctors":[{"name":"RouterReasoningLevel","fields":[{"name":"effort","type":{"kind":"string"}},{"name":"description","type":{"kind":"string"}}]}]},"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64":{"kind":"data","name":"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64","ctors":[{"name":"Concrete","fields":[]},{"name":"ProviderDynamicAlias","fields":[]},{"name":"OperatorAlias","fields":[]},{"name":"Unknown","fields":[]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function rp_776974685f636f6d6d616e642e636f6465785f636174616c6f672e6d6f64656c5f6d61795f6b6565705f726561736f6e696e675f6566666f7274(model, effort) {
  ml_assert_immutable_iterator(model);
  ml_validate_rust_value(model, {"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f757465724d6f64656c"}, ml_host_value_schema_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379, { refinements: ml_host_value_refinements_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379 });
  if (!(typeof effort === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(effort))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_callback_self_2 = (() => { const ml_shared_immutable_value = (() => {
      const ml_standard_shared_1 = (() => { const ml_shared_immutable_value = (model).supported_reasoning_levels; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      const ml_s1 = ml_standard_shared_1;
      switch (ml_s1.$) {
        case "None": {
          return Object.freeze({ $: 'None' });
        }
        case "Some": {
          const x = ml_s1.field0;
          return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: x }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f3130385f7265666572656e63655f7368617265645f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663"}, ml_constructor_value_schema_6e817ec55fa8f45ca54ad6af4f52b3c6eb27d9ef1456c81b8c53ffca8c1e6f55);
        }
        default: {
          return ml_router_unexpected(ml_s1);
        }
      }
    })(); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_callback_self_2.$) {
      case "None": {
        return true;
      }
      case "Some": {
        const ml_standard_pattern_3 = ml_standard_callback_self_2.field0;
        const ml_standard_callback_arg_1 = ml_standard_pattern_3;
        const levels = ml_standard_callback_arg_1;
        return ml_router_any(ml_router_iter(levels, true), (level) => { return ((level).effort === effort); });
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_2);
      }
    }
  })();
}

export const translated = { ["model_may_keep_reasoning_effort"]: rp_776974685f636f6d6d616e642e636f6465785f636174616c6f672e6d6f64656c5f6d61795f6b6565705f726561736f6e696e675f6566666f7274 };
export const provenance = {"sourcePath":"rust/src/with_command_codex_catalog.rs","sourceSha256":"48264a8549e559f62a3259c41162fd19ec29311fe29fd0ef4505c604397b890b","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":9,"runtimeParity":false};
