// Generated draft from src/deploy_local/service.rs; sha256=11acbe449d5b18fec6e4935bdbcb8414a15fa63eb1a3be6815d59218f2ab007d
// Carried constructs are data, never runtime parity evidence.
function MANAGER_ENV() {
  return "LINK_ASSISTANT_ROUTER_SERVICE_MANAGER";
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

function RECORD() {
  return "service.json";
}

function SECRET() {
  return "token-secret";
}

export const translated = { ["MANAGER_ENV"]: MANAGER_ENV(), ["RECORD"]: RECORD(), ["SECRET"]: SECRET() };
export const provenance = {"sourcePath":"src/deploy_local/service.rs","sourceSha256":"11acbe449d5b18fec6e4935bdbcb8414a15fa63eb1a3be6815d59218f2ab007d","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":30,"runtimeParity":false};
