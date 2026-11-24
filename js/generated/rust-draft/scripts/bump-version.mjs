// Generated draft from scripts/bump-version.rs; sha256=bde768df410dbd458795061b35bcf29415125041db1672efcea296d4778161c0
// Carried constructs are data, never runtime parity evidence.
function ml_make_BumpType_Major() {
  return Object.freeze({ $: 'Major' });
}

function ml_make_BumpType_Minor() {
  return Object.freeze({ $: 'Minor' });
}

function ml_make_BumpType_Patch() {
  return Object.freeze({ $: 'Patch' });
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

export const translated = { ["BumpType"]: Object.freeze({ ["Major"]: ml_make_BumpType_Major, ["Minor"]: ml_make_BumpType_Minor, ["Patch"]: ml_make_BumpType_Patch }) };
export const provenance = {"sourcePath":"scripts/bump-version.rs","sourceSha256":"bde768df410dbd458795061b35bcf29415125041db1672efcea296d4778161c0","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":15,"preserved":16,"runtimeParity":false};
