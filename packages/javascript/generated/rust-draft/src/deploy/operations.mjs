// Generated draft from src/deploy/operations.rs; sha256=8c13bf36b3dfddb24e59acbf2e83f459364932114cba0029337e6f06c27eb378
// Carried constructs are data, never runtime parity evidence.
function ml_make_PlanError_PlanError(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "PlanError", ["field0"]: field0 });
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

export const translated = { ["PlanError"]: ml_make_PlanError_PlanError };
export const provenance = {"sourcePath":"src/deploy/operations.rs","sourceSha256":"8c13bf36b3dfddb24e59acbf2e83f459364932114cba0029337e6f06c27eb378","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":15,"preserved":17,"runtimeParity":false};
