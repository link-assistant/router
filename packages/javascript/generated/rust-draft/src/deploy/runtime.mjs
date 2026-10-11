// Generated draft from src/deploy/runtime.rs; sha256=f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04
// Carried constructs are data, never runtime parity evidence.
function ml_make_ContainerState_Absent() {
  return Object.freeze({ $: 'Absent' });
}

function ml_make_ContainerState_Running() {
  return Object.freeze({ $: 'Running' });
}

function ml_make_ContainerState_Stopped() {
  return Object.freeze({ $: 'Stopped' });
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

function ml_make_Docker_Docker() {
  return Object.freeze({ $: "Docker" });
}

export const translated = { ["ContainerState"]: Object.freeze({ ["Absent"]: ml_make_ContainerState_Absent, ["Running"]: ml_make_ContainerState_Running, ["Stopped"]: ml_make_ContainerState_Stopped }), ["Docker"]: ml_make_Docker_Docker };
export const provenance = {"sourcePath":"src/deploy/runtime.rs","sourceSha256":"f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":4,"carried":13,"preserved":16,"runtimeParity":false};
