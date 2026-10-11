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
};

const serde_json = {
  error: {

  },
};

function explain_unavailable(error_2) {
  if (!(typeof error_2 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(error_2))) throw new TypeError('argument outside supported Rust value domain');
  const lowered = (error_2).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  if (lowered.includes("permission denied")) {
    return "permission denied while connecting to Docker; add this user to the Docker group";
  } else {
    if (lowered.includes("not installed")) {
      return error_2;
    } else {
      return ("the Docker daemon is not running or unreachable: " + error_2);
    }
  }
}

function is_absent(error_2) {
  if (!(typeof error_2 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(error_2))) throw new TypeError('argument outside supported Rust value domain');
  const lowered = (error_2).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  return ((lowered.includes("no such object") || lowered.includes("no such container")) || lowered.includes("no such image"));
}

export const translated = { ["ContainerState"]: Object.freeze({ ["Absent"]: ml_make_ContainerState_Absent, ["Running"]: ml_make_ContainerState_Running, ["Stopped"]: ml_make_ContainerState_Stopped }), ["explain_unavailable"]: explain_unavailable, ["is_absent"]: is_absent };
export const provenance = {"sourcePath":"src/deploy/runtime.rs","sourceSha256":"f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04","executable":3,"executableFunctions":2,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":12,"preserved":16,"runtimeParity":false};
