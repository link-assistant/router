// Generated draft from src/clients/catalog.rs; sha256=6fff6e91d5940ce7457af9d565d872f372d1ebcce7835e8ad3f377a77cc54e97
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

const ml_host_value_schema_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_526f757465724f7074696f6e5f335f693634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"rp_526f757465724f7074696f6e5f38325f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f34333663363137353634363534643666363436353663343336313730363136323639366336393734363936353733":{"kind":"data","name":"rp_526f757465724f7074696f6e5f38325f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f34333663363137353634363534643666363436353663343336313730363136323639366336393734363936353733","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e436c617564654d6f64656c4361706162696c6974696573"}}]}]},"rp_526f757465724f7074696f6e5f39315f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663":{"kind":"data","name":"rp_526f757465724f7074696f6e5f39315f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c"}}}]}]},"rp_636c69656e74732e636174616c6f672e436c617564654d6f64656c4361706162696c6974696573":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e436c617564654d6f64656c4361706162696c6974696573","ctors":[{"name":"ClaudeModelCapabilities","fields":[{"name":"behaves_as","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}}]}]},"rp_636c69656e74732e636174616c6f672e526f75746572436c69656e744361706162696c6974696573":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572436c69656e744361706162696c6974696573","ctors":[{"name":"RouterClientCapabilities","fields":[{"name":"claude","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f38325f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f34333663363137353634363534643666363436353663343336313730363136323639366336393734363936353733"}}]}]},"rp_636c69656e74732e636174616c6f672e526f757465724d6f64656c":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f757465724d6f64656c","ctors":[{"name":"RouterModel","fields":[{"name":"id","type":{"kind":"string"}},{"name":"owned_by","type":{"kind":"string"}},{"name":"selector_kind","type":{"kind":"data","name":"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64"}},{"name":"capability_provenance","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}},{"name":"default_reasoning_level","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"provider_created_at","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634"}},{"name":"supported_reasoning_levels","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f39315f727573745f6f776e65645f7665635f6e616d65645f36333663363936353665373437335f36333631373436313663366636375f35323666373537343635373235323635363137333666366536393665363734633635373636353663"}},{"name":"client_capabilities","type":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572436c69656e744361706162696c6974696573"}},{"name":"router_unavailable_reason","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}}]}]},"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f75746572526561736f6e696e674c6576656c","ctors":[{"name":"RouterReasoningLevel","fields":[{"name":"effort","type":{"kind":"string"}},{"name":"description","type":{"kind":"string"}}]}]},"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64":{"kind":"data","name":"rp_6d6f64656c5f636f6e74726163742e4d6f64656c53656c6563746f724b696e64","ctors":[{"name":"Concrete","fields":[]},{"name":"ProviderDynamicAlias","fields":[]},{"name":"OperatorAlias","fields":[]},{"name":"Unknown","fields":[]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function rp_636c69656e74732e414e5448524f5049435f4d4f44454c5f4f574e4552() {
  return "anthropic";
}

function rp_636c69656e74732e636174616c6f672e636c617564655f636f6e746578745f76617269616e745f69735f617574686f72697a6564(models, requested) {
  ml_assert_immutable_iterator(models);
  ml_validate_rust_value(models, {"kind":"array","element":{"kind":"data","name":"rp_636c69656e74732e636174616c6f672e526f757465724d6f64656c"}}, ml_host_value_schema_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379, { refinements: ml_host_value_refinements_53c9e0da3f7623185b48cc1d05251224f3b9286bfb7d43f0786d6b7d511ff379 });
  if (!(typeof requested === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(requested))) throw new TypeError('argument outside supported Rust value domain');
  const ml_pattern_3 = (() => {
    const ml_standard_callback_self_3 = (() => {
      const ml_text_1 = requested;
      const ml_text_2 = "[1m]";
      return (ml_text_1.endsWith(ml_text_2)?Object.freeze({ $: 'Some', field0: ml_text_1.slice(0,ml_text_1.length-ml_text_2.length) }):Object.freeze({ $: 'None' }));
    })();
    return (() => {
    const ml_pattern_1 = ml_standard_callback_self_3;
    if ((ml_pattern_immutable(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
      const ml_standard_pattern_4 = (ml_pattern_1)["field0"];
      if ((() => {
      const ml_standard_callback_arg_2 = ml_standard_pattern_4;
      const base = ml_standard_callback_arg_2;
      return !(base.length === 0);
    })()) {
        return Object.freeze({ $: 'Some', field0: ml_standard_pattern_4 });
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })();
  if ((ml_pattern_immutable(ml_pattern_3) && (ml_pattern_3.$ === "Some"))) {
  } else {
    return false;
  }
  const base_2 = (ml_pattern_3)["field0"];
  return ml_router_any(ml_router_iter(models, true), (model) => { return (((model).id === base_2) && ((model).owned_by === rp_636c69656e74732e414e5448524f5049435f4d4f44454c5f4f574e4552())); });
}

function rp_636c69656e74732e636174616c6f672e46524553485f5a41495f5052454645525245445f4d4f44454c() {
  return "glm-5.3";
}

export const translated = { ["claude_context_variant_is_authorized"]: rp_636c69656e74732e636174616c6f672e636c617564655f636f6e746578745f76617269616e745f69735f617574686f72697a6564, ["FRESH_ZAI_PREFERRED_MODEL"]: rp_636c69656e74732e636174616c6f672e46524553485f5a41495f5052454645525245445f4d4f44454c() };
export const provenance = {"sourcePath":"src/clients/catalog.rs","sourceSha256":"6fff6e91d5940ce7457af9d565d872f372d1ebcce7835e8ad3f377a77cc54e97","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":19,"preserved":22,"runtimeParity":false};
