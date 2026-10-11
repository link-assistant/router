// Generated draft from src/deploy_remote/session.rs; sha256=85e3307737d25c19db8bf5c9da192962e14a60e7c1c68e183978a86472f97383
// Carried constructs are data, never runtime parity evidence.
function DEADLINE_EXIT() {
  return 12n;
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

function EVENT_PREFIX() {
  return "ROUTER_DEPLOY_EVENT ";
}

function ml_make_Echo_Keep() {
  return Object.freeze({ $: 'Keep' });
}

function ml_make_Echo_Stdout() {
  return Object.freeze({ $: 'Stdout' });
}

function ml_make_Echo_Stderr() {
  return Object.freeze({ $: 'Stderr' });
}

export const translated = { ["DEADLINE_EXIT"]: DEADLINE_EXIT(), ["EVENT_PREFIX"]: EVENT_PREFIX(), ["Echo"]: Object.freeze({ ["Keep"]: ml_make_Echo_Keep, ["Stdout"]: ml_make_Echo_Stdout, ["Stderr"]: ml_make_Echo_Stderr }) };
export const provenance = {"sourcePath":"src/deploy_remote/session.rs","sourceSha256":"85e3307737d25c19db8bf5c9da192962e14a60e7c1c68e183978a86472f97383","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":3,"carried":22,"preserved":26,"runtimeParity":false};
