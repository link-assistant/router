// Generated draft from src/provider_import.rs; sha256=20277b79472978275b615a15b0b8dd99f785cc18a1030337d9f11889d9d045b6
// Carried constructs are data, never runtime parity evidence.
function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function unquote(value) {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_unwrap(ml_host_option_bind((() => {
    const ml_text_33 = value;
    const ml_text_34 = "\"";
    return (ml_text_33.startsWith(ml_text_34)?Object.freeze({ $: 'Some', field0: ml_text_33.slice(ml_text_34.length) }):Object.freeze({ $: 'None' }));
  })(), (v) => { const ml_text_35 = v;
  const ml_text_36 = "\"";
  return (ml_text_35.endsWith(ml_text_36)?Object.freeze({ $: 'Some', field0: ml_text_35.slice(0,ml_text_35.length-ml_text_36.length) }):Object.freeze({ $: 'None' })); }, "and_then"), value, true);
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

export const translated = { ["unquote"]: unquote };
export const provenance = {"sourcePath":"src/provider_import.rs","sourceSha256":"20277b79472978275b615a15b0b8dd99f785cc18a1030337d9f11889d9d045b6","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":6,"preserved":7,"runtimeParity":false};
