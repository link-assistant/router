// Generated draft from scripts/bump-version.rs; sha256=1c0ca091123e298f6e5cc02b6b9a01a0172088c252dbaf9e9ce9348a412fe723
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

const serde_json = {
  error: {

  },
};

export const translated = { ["BumpType"]: Object.freeze({ ["Major"]: ml_make_BumpType_Major, ["Minor"]: ml_make_BumpType_Minor, ["Patch"]: ml_make_BumpType_Patch }) };
export const provenance = {"sourcePath":"scripts/bump-version.rs","sourceSha256":"1c0ca091123e298f6e5cc02b6b9a01a0172088c252dbaf9e9ce9348a412fe723","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":15,"preserved":16,"runtimeParity":false};
