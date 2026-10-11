// Generated draft from src/storage.rs; sha256=d301981bd64c7b8726fbe89e13c7d580a66e7219ca5137c70aee0930f30e3050
// Carried constructs are data, never runtime parity evidence.
function ml_make_RequestAdmission_Admitted() {
  return Object.freeze({ $: 'Admitted' });
}

function ml_make_RequestAdmission_RequestLimitExceeded() {
  return Object.freeze({ $: 'RequestLimitExceeded' });
}

function ml_make_RequestAdmission_TokenLimitExceeded() {
  return Object.freeze({ $: 'TokenLimitExceeded' });
}

function ml_make_RequestAdmission_RateLimitExceeded() {
  return Object.freeze({ $: 'RateLimitExceeded' });
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

export const translated = { ["RequestAdmission"]: Object.freeze({ ["Admitted"]: ml_make_RequestAdmission_Admitted, ["RequestLimitExceeded"]: ml_make_RequestAdmission_RequestLimitExceeded, ["TokenLimitExceeded"]: ml_make_RequestAdmission_TokenLimitExceeded, ["RateLimitExceeded"]: ml_make_RequestAdmission_RateLimitExceeded }) };
export const provenance = {"sourcePath":"src/storage.rs","sourceSha256":"d301981bd64c7b8726fbe89e13c7d580a66e7219ca5137c70aee0930f30e3050","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":4,"carried":43,"preserved":45,"runtimeParity":false};
