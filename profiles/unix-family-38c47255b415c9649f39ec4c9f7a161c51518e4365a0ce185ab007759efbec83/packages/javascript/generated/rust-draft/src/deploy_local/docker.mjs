// Generated draft from src/deploy_local/docker.rs; sha256=37f19ce8cf20c41820c14191e5233217b855825579abe94a3477706746249e72
// Carried constructs are data, never runtime parity evidence.
import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_71fe266f216ca6daf5f87dcef4fd00cd399c6ff5460c5b78e03ee44c1659bce2 = {"schemaVersion":1,"types":{"CommandOutput":{"kind":"data","name":"CommandOutput","ctors":[{"name":"CommandOutput","fields":[{"name":"success","type":{"kind":"bool"}},{"name":"stdout","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}},{"name":"stderr","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}}]}]}}};

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_CommandOutput_CommandOutput(success, stdout, stderr) {
  if (!(typeof success === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(stdout, {"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(stdout, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(stderr, {"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(stderr, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "CommandOutput", ["success"]: success, ["stdout"]: stdout, ["stderr"]: stderr }), {"kind":"data","name":"CommandOutput"}, ml_constructor_value_schema_71fe266f216ca6daf5f87dcef4fd00cd399c6ff5460c5b78e03ee44c1659bce2);
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

function ml_make_ProcessRunner_ProcessRunner() {
  return Object.freeze({ $: "ProcessRunner" });
}

export const translated = { ["CommandOutput"]: ml_make_CommandOutput_CommandOutput, ["ProcessRunner"]: ml_make_ProcessRunner_ProcessRunner };
export const provenance = {"sourcePath":"src/deploy_local/docker.rs","sourceSha256":"37f19ce8cf20c41820c14191e5233217b855825579abe94a3477706746249e72","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":2,"carried":13,"preserved":16,"runtimeParity":false};
