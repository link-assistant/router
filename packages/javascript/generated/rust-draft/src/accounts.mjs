// Generated draft from src/accounts.rs; sha256=d1856d49f32a559ca5c464a66a7da76c2354a2f3723cc53ccb141056f646baee
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_make_RoutingContext_RoutingContext(session_key, parent_session_key, pinned_account, model, exclude) {
  ml_validate_rust_value(session_key, {"kind":"data","name":"RouterOption_6_string","patternOwnershipRefusal":"ownership-bearing String type"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(parent_session_key, {"kind":"data","name":"RouterOption_6_string","patternOwnershipRefusal":"ownership-bearing String type"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(pinned_account, {"kind":"data","name":"RouterOption_6_string","patternOwnershipRefusal":"ownership-bearing String type"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(model, {"kind":"data","name":"RouterOption_6_string","patternOwnershipRefusal":"ownership-bearing String type"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (!ml_router_array(exclude, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "RoutingContext", ["session_key"]: session_key, ["parent_session_key"]: parent_session_key, ["pinned_account"]: pinned_account, ["model"]: model, ["exclude"]: exclude });
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

function ml_make_SelectedAccount_SelectedAccount(name, token) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "SelectedAccount", ["name"]: name, ["token"]: token });
}

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

export const translated = { ["RoutingContext"]: ml_make_RoutingContext_RoutingContext, ["SelectedAccount"]: ml_make_SelectedAccount_SelectedAccount, ["SelectionMode"]: Object.freeze({ ["Automatic"]: ml_make_SelectionMode_Automatic, ["Pinned"]: ml_make_SelectionMode_Pinned, ["Session"]: ml_make_SelectionMode_Session, ["Detour"]: ml_make_SelectionMode_Detour }), ["CredentialState"]: Object.freeze({ ["Usable"]: ml_make_CredentialState_Usable, ["Refreshable"]: ml_make_CredentialState_Refreshable, ["Rejected"]: ml_make_CredentialState_Rejected, ["Expired"]: ml_make_CredentialState_Expired, ["Unusable"]: ml_make_CredentialState_Unusable }), ["AccountError"]: Object.freeze({ ["NoAccountsConfigured"]: ml_make_AccountError_NoAccountsConfigured, ["NoHealthyAccounts"]: ml_make_AccountError_NoHealthyAccounts, ["UnknownPinnedAccount"]: ml_make_AccountError_UnknownPinnedAccount, ["PinnedAccountUnavailable"]: ml_make_AccountError_PinnedAccountUnavailable, ["SessionAccountUnavailable"]: ml_make_AccountError_SessionAccountUnavailable, ["UnknownAccount"]: ml_make_AccountError_UnknownAccount }) };
export const provenance = {"sourcePath":"src/accounts.rs","sourceSha256":"d1856d49f32a559ca5c464a66a7da76c2354a2f3723cc53ccb141056f646baee","executable":5,"executableFunctions":0,"executableConstants":0,"executableTypes":5,"executableConstructors":17,"carried":31,"preserved":37,"runtimeParity":false};
