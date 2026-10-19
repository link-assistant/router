// Generated draft from rust/src/deploy_config.rs; sha256=3ae8cf1934d158188b5685421eb38e9b39adab01a0d89873ce91ba663ae4483c
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6 = {"schemaVersion":1,"types":{"RouterOption_3_u16":{"kind":"data","name":"RouterOption_3_u16","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":16,"signed":false}}]}]}}};

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_5cd342e7cc8a2e0886c0f0a9a6ee9410bb8c6cfbec4d770bfc1b0d5d68ac94cc = {"schemaVersion":1,"types":{"DeploySection":{"kind":"data","name":"DeploySection","ctors":[{"name":"DeploySection","fields":[{"name":"server","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"instance","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"port","type":{"kind":"data","name":"RouterOption_3_u16"}},{"name":"public_port","type":{"kind":"data","name":"RouterOption_3_u16"}},{"name":"image","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"build","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"root","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"mode","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"claude_credentials","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"seed_credentials","type":{"kind":"array","element":{"kind":"string"}}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"RouterOption_3_u16":{"kind":"data","name":"RouterOption_3_u16","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":16,"signed":false}}]}]}}};

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

const ml_host_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6 = {"schemaVersion":1,"types":{"RouterOption_3_u16":{"kind":"data","name":"RouterOption_3_u16","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":16,"signed":false}}]}]}}};

const ml_host_value_refinements_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6 = new Map([]);

function rp_6465706c6f795f636f6e6669672e52455345525645445f454e56() {
  return Object.freeze(Object.freeze(["TOKEN_SECRET", "DATA_DIR", "STORAGE_POLICY", "HOME", "PATH", "USER", "SHELL", "PWD", "IFS", "CLAUDE_CODE_HOME", "CLAUDE_CONFIG_DIR", "LISTENERS", "ROUTER_HOST", "ROUTER_PORT", "NODE_EXTRA_CA_CERTS"]));
}

function rp_6465706c6f795f636f6e6669672e52455345525645445f454e565f5052454649584553() {
  return Object.freeze(Object.freeze(["ROUTER_DEPLOY_", "TLS_", "VERIFY_", "PRESERVATION_"]));
}

function ml_make_DeploySection_DeploySection(server, instance, port, public_port, image, build, root, mode, claude_credentials, seed_credentials) {
  ml_assert_constructor_input(server, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(server, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(instance, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(instance, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(port, {"kind":"data","name":"RouterOption_3_u16"}, ml_constructor_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6);
  ml_validate_rust_value(port, {"kind":"data","name":"RouterOption_3_u16"}, ml_host_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6, { refinements: ml_host_value_refinements_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6 });
  ml_assert_constructor_input(public_port, {"kind":"data","name":"RouterOption_3_u16"}, ml_constructor_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6);
  ml_validate_rust_value(public_port, {"kind":"data","name":"RouterOption_3_u16"}, ml_host_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6, { refinements: ml_host_value_refinements_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6 });
  ml_assert_constructor_input(image, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(image, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(build, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(build, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(root, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(root, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(mode, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(mode, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(claude_credentials, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(claude_credentials, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(seed_credentials, {"kind":"array","element":{"kind":"string"}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(seed_credentials, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "DeploySection", ["server"]: server, ["instance"]: instance, ["port"]: port, ["public_port"]: public_port, ["image"]: image, ["build"]: build, ["root"]: root, ["mode"]: mode, ["claude_credentials"]: claude_credentials, ["seed_credentials"]: seed_credentials }), {"kind":"data","name":"DeploySection"}, ml_constructor_value_schema_5cd342e7cc8a2e0886c0f0a9a6ee9410bb8c6cfbec4d770bfc1b0d5d68ac94cc);
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

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

function rp_6465706c6f795f636f6e6669672e56455249464941424c455f434c49454e5453() {
  return Object.freeze(Object.freeze(["claude", "codex", "qwen-code", "gemini", "opencode"]));
}

export const translated = { ["RESERVED_ENV"]: rp_6465706c6f795f636f6e6669672e52455345525645445f454e56(), ["RESERVED_ENV_PREFIXES"]: rp_6465706c6f795f636f6e6669672e52455345525645445f454e565f5052454649584553(), ["DeploySection"]: ml_make_DeploySection_DeploySection, ["VERIFIABLE_CLIENTS"]: rp_6465706c6f795f636f6e6669672e56455249464941424c455f434c49454e5453() };
export const provenance = {"sourcePath":"rust/src/deploy_config.rs","sourceSha256":"3ae8cf1934d158188b5685421eb38e9b39adab01a0d89873ce91ba663ae4483c","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":1,"carried":50,"preserved":55,"runtimeParity":false};
