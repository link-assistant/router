// Generated draft from src/admin_recovery_tests.rs; sha256=e9eca1e4f57719cc8e5023ffbeba7ee2eec9045f9ecc24e2b59af43c44e0036f
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "a-test-signing-secret-for-admin-recovery";
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

function ml_make_UnreadableStore_UnreadableStore() {
  return Object.freeze({ $: "UnreadableStore" });
}

export const translated = { ["SECRET"]: SECRET(), ["UnreadableStore"]: ml_make_UnreadableStore_UnreadableStore };
export const provenance = {"sourcePath":"src/admin_recovery_tests.rs","sourceSha256":"e9eca1e4f57719cc8e5023ffbeba7ee2eec9045f9ecc24e2b59af43c44e0036f","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":21,"preserved":24,"runtimeParity":false};
