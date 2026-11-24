// Generated draft from src/deploy_local/host_runtime.rs; sha256=87ba9e066820eb30cd9dabb25c6c0d6f192be78b9b15c97e833ac05757050749
// Carried constructs are data, never runtime parity evidence.
function ml_make_ClaudeLogin_Keychain() {
  return Object.freeze({ $: 'Keychain' });
}

function ml_make_ClaudeLogin_File() {
  return Object.freeze({ $: 'File' });
}

function ml_make_ClaudeLogin_Absent() {
  return Object.freeze({ $: 'Absent' });
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

export const translated = { ["ClaudeLogin"]: Object.freeze({ ["Keychain"]: ml_make_ClaudeLogin_Keychain, ["File"]: ml_make_ClaudeLogin_File, ["Absent"]: ml_make_ClaudeLogin_Absent }) };
export const provenance = {"sourcePath":"src/deploy_local/host_runtime.rs","sourceSha256":"87ba9e066820eb30cd9dabb25c6c0d6f192be78b9b15c97e833ac05757050749","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":21,"preserved":23,"runtimeParity":false};
