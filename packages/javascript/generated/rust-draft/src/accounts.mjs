// Generated draft from src/accounts.rs; sha256=d1856d49f32a559ca5c464a66a7da76c2354a2f3723cc53ccb141056f646baee
// Carried constructs are data, never runtime parity evidence.
function ml_make_SelectedAccount_SelectedAccount(name, token) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "SelectedAccount", ["name"]: name, ["token"]: token });
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

function ml_make_SelectionMode_Automatic() {
  return Object.freeze({ $: 'Automatic' });
}

function ml_make_SelectionMode_Pinned() {
  return Object.freeze({ $: 'Pinned' });
}

function ml_make_SelectionMode_Session() {
  return Object.freeze({ $: 'Session' });
}

function ml_make_SelectionMode_Detour() {
  return Object.freeze({ $: 'Detour' });
}

function ml_make_CredentialState_Usable() {
  return Object.freeze({ $: 'Usable' });
}

function ml_make_CredentialState_Refreshable() {
  return Object.freeze({ $: 'Refreshable' });
}

function ml_make_CredentialState_Rejected() {
  return Object.freeze({ $: 'Rejected' });
}

function ml_make_CredentialState_Expired() {
  return Object.freeze({ $: 'Expired' });
}

function ml_make_CredentialState_Unusable(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Unusable', field0: field0 });
}

function ml_make_AccountError_NoAccountsConfigured() {
  return Object.freeze({ $: 'NoAccountsConfigured' });
}

function ml_make_AccountError_NoHealthyAccounts() {
  return Object.freeze({ $: 'NoHealthyAccounts' });
}

function ml_make_AccountError_UnknownPinnedAccount(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'UnknownPinnedAccount', field0: field0 });
}

function ml_make_AccountError_PinnedAccountUnavailable(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'PinnedAccountUnavailable', field0: field0 });
}

function ml_make_AccountError_SessionAccountUnavailable(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'SessionAccountUnavailable', field0: field0 });
}

function ml_make_AccountError_UnknownAccount(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'UnknownAccount', field0: field0 });
}

export const translated = { ["SelectedAccount"]: ml_make_SelectedAccount_SelectedAccount, ["SelectionMode"]: Object.freeze({ ["Automatic"]: ml_make_SelectionMode_Automatic, ["Pinned"]: ml_make_SelectionMode_Pinned, ["Session"]: ml_make_SelectionMode_Session, ["Detour"]: ml_make_SelectionMode_Detour }), ["CredentialState"]: Object.freeze({ ["Usable"]: ml_make_CredentialState_Usable, ["Refreshable"]: ml_make_CredentialState_Refreshable, ["Rejected"]: ml_make_CredentialState_Rejected, ["Expired"]: ml_make_CredentialState_Expired, ["Unusable"]: ml_make_CredentialState_Unusable }), ["AccountError"]: Object.freeze({ ["NoAccountsConfigured"]: ml_make_AccountError_NoAccountsConfigured, ["NoHealthyAccounts"]: ml_make_AccountError_NoHealthyAccounts, ["UnknownPinnedAccount"]: ml_make_AccountError_UnknownPinnedAccount, ["PinnedAccountUnavailable"]: ml_make_AccountError_PinnedAccountUnavailable, ["SessionAccountUnavailable"]: ml_make_AccountError_SessionAccountUnavailable, ["UnknownAccount"]: ml_make_AccountError_UnknownAccount }) };
export const provenance = {"sourcePath":"src/accounts.rs","sourceSha256":"d1856d49f32a559ca5c464a66a7da76c2354a2f3723cc53ccb141056f646baee","executable":4,"executableFunctions":0,"executableConstants":0,"executableTypes":4,"executableConstructors":16,"carried":32,"preserved":37,"runtimeParity":false};
