// Generated draft from src/deploy_local/host.rs; sha256=193445fd3ed840b57d89014579da778bb2594cc18f3a4f8ed546e6f8b5be36d6
// Carried constructs are data, never runtime parity evidence.
function ROLLBACK_COMMAND() {
  return "router deploy --mode container";
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

function ml_make_Blocker_Blocker(name, reason, forceable) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof forceable === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Blocker", ["name"]: name, ["reason"]: reason, ["forceable"]: forceable });
}

export const translated = { ["ROLLBACK_COMMAND"]: ROLLBACK_COMMAND(), ["Blocker"]: ml_make_Blocker_Blocker };
export const provenance = {"sourcePath":"src/deploy_local/host.rs","sourceSha256":"193445fd3ed840b57d89014579da778bb2594cc18f3a4f8ed546e6f8b5be36d6","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":14,"preserved":17,"runtimeParity":false};
