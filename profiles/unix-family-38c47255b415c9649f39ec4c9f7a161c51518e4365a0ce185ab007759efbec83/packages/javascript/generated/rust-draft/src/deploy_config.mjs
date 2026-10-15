// Generated draft from src/deploy_config.rs; sha256=3ae8cf1934d158188b5685421eb38e9b39adab01a0d89873ce91ba663ae4483c
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

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
  ml_validate_rust_value(server, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(instance, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(port, {"kind":"data","name":"RouterOption_3_u16"}, ml_host_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6, { refinements: ml_host_value_refinements_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6 });
  ml_validate_rust_value(public_port, {"kind":"data","name":"RouterOption_3_u16"}, ml_host_value_schema_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6, { refinements: ml_host_value_refinements_49ea3513b5fa42fb1de650645fcc2af7a5b3e1eabdaa1ad43cd8fd8db4d204c6 });
  ml_validate_rust_value(image, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(build, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(root, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(mode, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(claude_credentials, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  if (!ml_router_array(seed_credentials, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "DeploySection", ["server"]: server, ["instance"]: instance, ["port"]: port, ["public_port"]: public_port, ["image"]: image, ["build"]: build, ["root"]: root, ["mode"]: mode, ["claude_credentials"]: claude_credentials, ["seed_credentials"]: seed_credentials });
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

function rp_6465706c6f795f636f6e6669672e56455249464941424c455f434c49454e5453() {
  return Object.freeze(Object.freeze(["claude", "codex", "qwen-code", "gemini", "opencode"]));
}

export const translated = { ["RESERVED_ENV"]: rp_6465706c6f795f636f6e6669672e52455345525645445f454e56(), ["RESERVED_ENV_PREFIXES"]: rp_6465706c6f795f636f6e6669672e52455345525645445f454e565f5052454649584553(), ["DeploySection"]: ml_make_DeploySection_DeploySection, ["VERIFIABLE_CLIENTS"]: rp_6465706c6f795f636f6e6669672e56455249464941424c455f434c49454e5453() };
export const provenance = {"sourcePath":"src/deploy_config.rs","sourceSha256":"3ae8cf1934d158188b5685421eb38e9b39adab01a0d89873ce91ba663ae4483c","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":1,"carried":50,"preserved":55,"runtimeParity":false};
