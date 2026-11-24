// Generated draft from src/subscription_usage.rs; sha256=d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_0778c08dc8e9f455841d8787ab31748bbd6665123b8269a24513e264712f9b84 = {"schemaVersion":1,"types":{"SafeCredentialMetadata":{"kind":"data","name":"SafeCredentialMetadata","ctors":[{"name":"SafeCredentialMetadata","fields":[{"name":"plan","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"subscription_end","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

const ml_constructor_value_schema_a4a54dfcc2861d63fbf10cabc1f196a12e4ed51b07a7bcf01c94da8808aa79d4 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732":{"kind":"data","name":"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"ZAi","fields":[]},{"name":"Lefine","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

function rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e() {
  return 1n;
}

function rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459() {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_SafeCredentialMetadata_SafeCredentialMetadata(plan, subscription_end) {
  ml_assert_constructor_input(plan, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(plan, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(subscription_end, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(subscription_end, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return ml_snapshot_constructor_value(Object.freeze({ $: "SafeCredentialMetadata", ["plan"]: plan, ["subscription_end"]: subscription_end }), {"kind":"data","name":"SafeCredentialMetadata"}, ml_constructor_value_schema_0778c08dc8e9f455841d8787ab31748bbd6665123b8269a24513e264712f9b84);
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function ml_make_BoundedBodyError_TooLarge() {
  return Object.freeze({ $: 'TooLarge' });
}

function ml_make_BoundedBodyError_Read() {
  return Object.freeze({ $: 'Read' });
}

function rp_737562736372697074696f6e5f75736167652e70617273655f70726f7669646572(provider) {
  if (!(typeof provider === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider))) throw new TypeError('argument outside supported Rust value domain');
  if ((provider === "anthropic")) {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Anthropic' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732"}, ml_constructor_value_schema_a4a54dfcc2861d63fbf10cabc1f196a12e4ed51b07a7bcf01c94da8808aa79d4);
  } else {
    if ((provider === "openai")) {
      return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'OpenAi' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732"}, ml_constructor_value_schema_a4a54dfcc2861d63fbf10cabc1f196a12e4ed51b07a7bcf01c94da8808aa79d4);
    } else {
      if ((provider === "z-ai")) {
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ZAi' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732"}, ml_constructor_value_schema_a4a54dfcc2861d63fbf10cabc1f196a12e4ed51b07a7bcf01c94da8808aa79d4);
      } else {
        if ((provider === "lefine")) {
          return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Lefine' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732"}, ml_constructor_value_schema_a4a54dfcc2861d63fbf10cabc1f196a12e4ed51b07a7bcf01c94da8808aa79d4);
        } else {
          if ((provider === "gemini")) {
            return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Gemini' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732"}, ml_constructor_value_schema_a4a54dfcc2861d63fbf10cabc1f196a12e4ed51b07a7bcf01c94da8808aa79d4);
          } else {
            if ((provider === "qwen")) {
              return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Qwen' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f38305f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3535373336313637363535303732366637363639363436353732"}, ml_constructor_value_schema_a4a54dfcc2861d63fbf10cabc1f196a12e4ed51b07a7bcf01c94da8808aa79d4);
            } else {
              return Object.freeze({ $: 'None' });
            }
          }
        }
      }
    }
  }
}

export const translated = { ["SCHEMA_VERSION"]: rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e(), ["MAX_USAGE_BODY"]: rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459(), ["SafeCredentialMetadata"]: ml_make_SafeCredentialMetadata_SafeCredentialMetadata, ["BoundedBodyError"]: Object.freeze({ ["TooLarge"]: ml_make_BoundedBodyError_TooLarge, ["Read"]: ml_make_BoundedBodyError_Read }), ["parse_provider"]: rp_737562736372697074696f6e5f75736167652e70617273655f70726f7669646572 };
export const provenance = {"sourcePath":"src/subscription_usage.rs","sourceSha256":"d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9","executable":5,"executableFunctions":1,"executableConstants":2,"executableTypes":2,"executableConstructors":3,"carried":53,"preserved":58,"runtimeParity":false};
