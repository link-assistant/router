// Generated draft from src/provider_config.rs; sha256=7b0d579f0f084b45694fed3f2d89696567715c627fd8ffe768c8c7ea168eb0f7
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_88184795cd11d40b6dfffb576e4dac8158b66ecefde6f48d3f83f62703fac96f = {"schemaVersion":1,"types":{"OpenAICompatibleConfig":{"kind":"data","name":"OpenAICompatibleConfig","ctors":[{"name":"OpenAICompatibleConfig","fields":[{"name":"provider_name","type":{"kind":"string"}},{"name":"base_url","type":{"kind":"string"}},{"name":"api_key","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"api_key_env","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"default_model","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"models","type":{"kind":"array","element":{"kind":"string"}}},{"name":"supported_clients","type":{"kind":"array","element":{"kind":"string"}}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function ml_make_OpenAICompatibleConfig_OpenAICompatibleConfig(provider_name, base_url, api_key, api_key_env, default_model, models, supported_clients) {
  if (!(typeof provider_name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider_name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof base_url === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(base_url))) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(api_key, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(api_key, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(api_key_env, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(api_key_env, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(default_model, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(default_model, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(models, {"kind":"array","element":{"kind":"string"}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(models, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(supported_clients, {"kind":"array","element":{"kind":"string"}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(supported_clients, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "OpenAICompatibleConfig", ["provider_name"]: provider_name, ["base_url"]: base_url, ["api_key"]: api_key, ["api_key_env"]: api_key_env, ["default_model"]: default_model, ["models"]: models, ["supported_clients"]: supported_clients }), {"kind":"data","name":"OpenAICompatibleConfig"}, ml_constructor_value_schema_88184795cd11d40b6dfffb576e4dac8158b66ecefde6f48d3f83f62703fac96f);
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

export const translated = { ["OpenAICompatibleConfig"]: ml_make_OpenAICompatibleConfig_OpenAICompatibleConfig };
export const provenance = {"sourcePath":"src/provider_config.rs","sourceSha256":"7b0d579f0f084b45694fed3f2d89696567715c627fd8ffe768c8c7ea168eb0f7","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":2,"preserved":4,"runtimeParity":false};
