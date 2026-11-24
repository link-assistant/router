// Generated draft from src/stop_sequences.rs; sha256=076543eef5a7d763ab177b49ef732920aa7907b10911e43dda2c80dd5df7d73d
// Carried constructs are data, never runtime parity evidence.
import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_f62c18be7643462cb8d4acf9fb9eded115e3ff76b8666aecec919de35f6ebee0 = {"schemaVersion":1,"types":{"StopSequenceFilter":{"kind":"data","name":"StopSequenceFilter","ctors":[{"name":"StopSequenceFilter","fields":[{"name":"sequences","type":{"kind":"array","element":{"kind":"string"}}},{"name":"pending","type":{"kind":"string"}},{"name":"stopped","type":{"kind":"bool"}}]}]}}};

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_StopSequenceFilter_StopSequenceFilter(sequences, pending, stopped) {
  ml_assert_constructor_input(sequences, {"kind":"array","element":{"kind":"string"}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(sequences, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof pending === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(pending))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof stopped === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "StopSequenceFilter", ["sequences"]: sequences, ["pending"]: pending, ["stopped"]: stopped }), {"kind":"data","name":"StopSequenceFilter"}, ml_constructor_value_schema_f62c18be7643462cb8d4acf9fb9eded115e3ff76b8666aecec919de35f6ebee0);
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

export const translated = { ["StopSequenceFilter"]: ml_make_StopSequenceFilter_StopSequenceFilter };
export const provenance = {"sourcePath":"src/stop_sequences.rs","sourceSha256":"076543eef5a7d763ab177b49ef732920aa7907b10911e43dda2c80dd5df7d73d","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":5,"preserved":7,"runtimeParity":false};
