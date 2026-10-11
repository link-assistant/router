// Generated draft from src/deploy/step.rs; sha256=b17e7b027c78cc1b74fc310886bddbdf28cf5e02f5152de8a106ece8d3127909
// Carried constructs are data, never runtime parity evidence.
function ml_make_Outcome_AlreadyConverged(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'AlreadyConverged', field0: field0 });
}

function ml_make_Outcome_Acted(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Acted', field0: field0 });
}

function ml_make_Outcome_Skipped(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Skipped', field0: field0 });
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

function ml_make_Failure_Failure(step, purpose, expected, found) {
  if (!(typeof step === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(step))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof purpose === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(purpose))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof expected === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(expected))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof found === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(found))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Failure", ["step"]: step, ["purpose"]: purpose, ["expected"]: expected, ["found"]: found });
}

export const translated = { ["Outcome"]: Object.freeze({ ["AlreadyConverged"]: ml_make_Outcome_AlreadyConverged, ["Acted"]: ml_make_Outcome_Acted, ["Skipped"]: ml_make_Outcome_Skipped }), ["Failure"]: ml_make_Failure_Failure };
export const provenance = {"sourcePath":"src/deploy/step.rs","sourceSha256":"b17e7b027c78cc1b74fc310886bddbdf28cf5e02f5152de8a106ece8d3127909","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":4,"carried":8,"preserved":11,"runtimeParity":false};
