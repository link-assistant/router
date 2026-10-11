// Generated draft from tests/claude_code_feature_matrix_test.rs; sha256=f939acaab93a22968fbdca67c7b646e447c0abd31fa2452f40ae8162fae6242a
// Carried constructs are data, never runtime parity evidence.
function CLAUDE_MODEL() {
  return "claude-sonnet-4-5-20250929";
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

function PNG() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
}

function PDF() {
  return "JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nPj4KZW5kb2JqCnRyYWlsZXIKPDwvUm9vdCAxIDAgUj4+CiUlRU9G";
}

function ml_make_Bridged_Translated(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Translated', field0: field0 });
}

function ml_make_Bridged_Refused() {
  return Object.freeze({ $: 'Refused' });
}

export const translated = { ["CLAUDE_MODEL"]: CLAUDE_MODEL(), ["PNG"]: PNG(), ["PDF"]: PDF(), ["Bridged"]: Object.freeze({ ["Translated"]: ml_make_Bridged_Translated, ["Refused"]: ml_make_Bridged_Refused }) };
export const provenance = {"sourcePath":"tests/claude_code_feature_matrix_test.rs","sourceSha256":"f939acaab93a22968fbdca67c7b646e447c0abd31fa2452f40ae8162fae6242a","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":2,"carried":17,"preserved":22,"runtimeParity":false};
