// Generated draft from experiments/issue-725/test-sharder/src/main.rs; sha256=fd576096ed4b316481bffa102ea18b068ba7b30d4fd78a1b41bfbbe0ee41845f
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_Entries_Entries(field0) {
  if (!ml_router_array(field0, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 18446744073709551615n))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Entries", ["field0"]: field0 });
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

export const translated = { ["Entries"]: ml_make_Entries_Entries };
export const provenance = {"sourcePath":"experiments/issue-725/test-sharder/src/main.rs","sourceSha256":"fd576096ed4b316481bffa102ea18b068ba7b30d4fd78a1b41bfbbe0ee41845f","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":11,"preserved":13,"runtimeParity":false};
