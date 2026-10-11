// Generated draft from src/deploy_remote.rs; sha256=8e1156091bd5b9d16659d4ba4cd1e30100b615d960ef0e3af345a135b747c588
// Carried constructs are data, never runtime parity evidence.
function AGENT_LEASE_EXIT() {
  return 73n;
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

function TRANSPORT_EXIT() {
  return 10n;
}

function LEASE_EXIT() {
  return 11n;
}

function ml_make_RemoteMode_Deploy() {
  return Object.freeze({ $: 'Deploy' });
}

function ml_make_RemoteMode_Status() {
  return Object.freeze({ $: 'Status' });
}

function ml_make_RemoteMode_Down() {
  return Object.freeze({ $: 'Down' });
}

export const translated = { ["AGENT_LEASE_EXIT"]: AGENT_LEASE_EXIT(), ["TRANSPORT_EXIT"]: TRANSPORT_EXIT(), ["LEASE_EXIT"]: LEASE_EXIT(), ["RemoteMode"]: Object.freeze({ ["Deploy"]: ml_make_RemoteMode_Deploy, ["Status"]: ml_make_RemoteMode_Status, ["Down"]: ml_make_RemoteMode_Down }) };
export const provenance = {"sourcePath":"src/deploy_remote.rs","sourceSha256":"8e1156091bd5b9d16659d4ba4cd1e30100b615d960ef0e3af345a135b747c588","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":3,"carried":27,"preserved":32,"runtimeParity":false};
