// Generated draft from src/stop_sequences.rs; sha256=076543eef5a7d763ab177b49ef732920aa7907b10911e43dda2c80dd5df7d73d
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_StopSequenceFilter_StopSequenceFilter(sequences, pending, stopped) {
  if (!ml_router_array(sequences, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof pending === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(pending))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof stopped === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "StopSequenceFilter", ["sequences"]: sequences, ["pending"]: pending, ["stopped"]: stopped });
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
