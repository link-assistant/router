// Generated draft from src/deploy_local/docker.rs; sha256=37f19ce8cf20c41820c14191e5233217b855825579abe94a3477706746249e72
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_CommandOutput_CommandOutput(success, stdout, stderr) {
  if (!(typeof success === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(stdout, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(stderr, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "CommandOutput", ["success"]: success, ["stdout"]: stdout, ["stderr"]: stderr });
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

function ml_make_ProcessRunner_ProcessRunner() {
  return Object.freeze({ $: "ProcessRunner" });
}

export const translated = { ["CommandOutput"]: ml_make_CommandOutput_CommandOutput, ["ProcessRunner"]: ml_make_ProcessRunner_ProcessRunner };
export const provenance = {"sourcePath":"src/deploy_local/docker.rs","sourceSha256":"37f19ce8cf20c41820c14191e5233217b855825579abe94a3477706746249e72","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":2,"carried":13,"preserved":16,"runtimeParity":false};
