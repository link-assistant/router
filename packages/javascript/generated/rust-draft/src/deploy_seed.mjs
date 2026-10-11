// Generated draft from src/deploy_seed.rs; sha256=f8262b8e6b73eeb61e4f67ab1bbde8678369585c50b1225a0790df6974379a84
// Carried constructs are data, never runtime parity evidence.
function METADATA_KEY() {
  return "_link_assistant_router";
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
};

const serde_json = {
  error: {

  },
};

function HANDOVER_KEY() {
  return "handed_over";
}

function ml_make_SeedProvider_Claude() {
  return Object.freeze({ $: 'Claude' });
}

function ml_make_SeedProvider_Codex() {
  return Object.freeze({ $: 'Codex' });
}

export const translated = { ["METADATA_KEY"]: METADATA_KEY(), ["HANDOVER_KEY"]: HANDOVER_KEY(), ["SeedProvider"]: Object.freeze({ ["Claude"]: ml_make_SeedProvider_Claude, ["Codex"]: ml_make_SeedProvider_Codex }) };
export const provenance = {"sourcePath":"src/deploy_seed.rs","sourceSha256":"f8262b8e6b73eeb61e4f67ab1bbde8678369585c50b1225a0790df6974379a84","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":2,"carried":15,"preserved":19,"runtimeParity":false};
