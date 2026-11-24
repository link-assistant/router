// Generated draft from experiments/issue-725/test-sharder/src/main.rs; sha256=fd576096ed4b316481bffa102ea18b068ba7b30d4fd78a1b41bfbbe0ee41845f
// Carried constructs are data, never runtime parity evidence.
import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_e9c396555b72086e8ea19d494a172c9812544ce542bcaf3e64ca98dbfa5c392d = {"schemaVersion":1,"types":{"Entries":{"kind":"data","name":"Entries","ctors":[{"name":"Entries","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"fixed","bits":64,"signed":false}}}]}]}}};

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_Entries_Entries(field0) {
  ml_assert_constructor_input(field0, {"kind":"array","element":{"kind":"fixed","bits":64,"signed":false}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(field0, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 18446744073709551615n))) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "Entries", ["field0"]: field0 }), {"kind":"data","name":"Entries"}, ml_constructor_value_schema_e9c396555b72086e8ea19d494a172c9812544ce542bcaf3e64ca98dbfa5c392d);
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

export const translated = { ["Entries"]: ml_make_Entries_Entries };
export const provenance = {"sourcePath":"experiments/issue-725/test-sharder/src/main.rs","sourceSha256":"fd576096ed4b316481bffa102ea18b068ba7b30d4fd78a1b41bfbbe0ee41845f","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":11,"preserved":13,"runtimeParity":false};
