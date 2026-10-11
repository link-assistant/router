// Generated draft from src/management_access.rs; sha256=76edb01571172e5c4b7ccaaac48c95c55d0d7d16bb6f45f8b08d5a22bce18e5c
// Carried constructs are data, never runtime parity evidence.
function MAX_CLIENTS() {
  return 4096n;
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

function SNAPSHOT() {
  return "management-lockouts.lenv";
}

export const translated = { ["MAX_CLIENTS"]: MAX_CLIENTS(), ["SNAPSHOT"]: SNAPSHOT() };
export const provenance = {"sourcePath":"src/management_access.rs","sourceSha256":"76edb01571172e5c4b7ccaaac48c95c55d0d7d16bb6f45f8b08d5a22bce18e5c","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":18,"runtimeParity":false};
