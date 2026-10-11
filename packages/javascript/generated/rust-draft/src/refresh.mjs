// Generated draft from src/refresh.rs; sha256=dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108
// Carried constructs are data, never runtime parity evidence.
function ml_make_BodyStyle_Json() {
  return Object.freeze({ $: 'Json' });
}

function ml_make_BodyStyle_Form() {
  return Object.freeze({ $: 'Form' });
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

function rp_726566726573682e434c415544455f4f415554485f555345525f4147454e54() {
  return "anthropic-sdk-typescript/0.112.1 userOAuthProvider";
}

function rp_726566726573682e414e5448524f5049435f53444b5f56455253494f4e() {
  return "0.112.1";
}

function rp_726566726573682e47454d494e495f434c495f56455253494f4e() {
  return "0.59.0";
}

function rp_726566726573682e474f4f474c455f415554485f4c4942524152595f56455253494f4e() {
  return "10.9.0";
}

function rp_726566726573682e5157454e5f434f44455f56455253494f4e() {
  return "0.23.1";
}

function rp_726566726573682e47454d494e495f434c49454e545f49445f454e56() {
  return "GEMINI_OAUTH_CLIENT_ID";
}

function rp_726566726573682e47454d494e495f434c49454e545f5345435245545f454e56() {
  return "GEMINI_OAUTH_CLIENT_SECRET";
}

function rp_726566726573682e47454d494e495f434c49454e545f4944() {
  return "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
}

function rp_726566726573682e47454d494e495f415554485f555345525f4147454e54() {
  return "google-api-nodejs-client/10.9.0";
}

function rp_726566726573682e47454d494e495f4150495f434c49454e54() {
  return "gl-node/22.14.0";
}

function rp_726566726573682e434c415544455f434c49454e545f4944() {
  return "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
}

function rp_726566726573682e434c415544455f544f4b454e5f55524c() {
  return "https://platform.claude.com/v1/oauth/token";
}

function ml_make_RefreshStatusClass_InvalidGrant() {
  return Object.freeze({ $: 'InvalidGrant' });
}

function ml_make_RefreshStatusClass_InvalidClient() {
  return Object.freeze({ $: 'InvalidClient' });
}

function ml_make_RefreshStatusClass_UnauthorizedClient() {
  return Object.freeze({ $: 'UnauthorizedClient' });
}

function ml_make_RefreshStatusClass_UnsupportedGrantType() {
  return Object.freeze({ $: 'UnsupportedGrantType' });
}

function ml_make_RefreshStatusClass_RateLimited() {
  return Object.freeze({ $: 'RateLimited' });
}

function ml_make_RefreshStatusClass_ClientRejected() {
  return Object.freeze({ $: 'ClientRejected' });
}

function ml_make_RefreshStatusClass_Transient() {
  return Object.freeze({ $: 'Transient' });
}

function ml_make_RefreshStatusClass_UnexpectedStatus() {
  return Object.freeze({ $: 'UnexpectedStatus' });
}

function ml_make_ImportRefreshFailureKind_NotAttempted() {
  return Object.freeze({ $: 'NotAttempted' });
}

function ml_make_ImportRefreshFailureKind_ExchangeRejected() {
  return Object.freeze({ $: 'ExchangeRejected' });
}

function ml_make_ImportRefreshFailureKind_ExchangeUncertain() {
  return Object.freeze({ $: 'ExchangeUncertain' });
}

function ml_make_ImportRefreshFailureKind_PersistenceUncertain() {
  return Object.freeze({ $: 'PersistenceUncertain' });
}

function ml_make_CredentialEvidence_Working() {
  return Object.freeze({ $: 'Working' });
}

function ml_make_CredentialEvidence_Rejected() {
  return Object.freeze({ $: 'Rejected' });
}

export const translated = { ["BodyStyle"]: Object.freeze({ ["Json"]: ml_make_BodyStyle_Json, ["Form"]: ml_make_BodyStyle_Form }), ["CLAUDE_OAUTH_USER_AGENT"]: rp_726566726573682e434c415544455f4f415554485f555345525f4147454e54(), ["ANTHROPIC_SDK_VERSION"]: rp_726566726573682e414e5448524f5049435f53444b5f56455253494f4e(), ["GEMINI_CLI_VERSION"]: rp_726566726573682e47454d494e495f434c495f56455253494f4e(), ["GOOGLE_AUTH_LIBRARY_VERSION"]: rp_726566726573682e474f4f474c455f415554485f4c4942524152595f56455253494f4e(), ["QWEN_CODE_VERSION"]: rp_726566726573682e5157454e5f434f44455f56455253494f4e(), ["GEMINI_CLIENT_ID_ENV"]: rp_726566726573682e47454d494e495f434c49454e545f49445f454e56(), ["GEMINI_CLIENT_SECRET_ENV"]: rp_726566726573682e47454d494e495f434c49454e545f5345435245545f454e56(), ["GEMINI_CLIENT_ID"]: rp_726566726573682e47454d494e495f434c49454e545f4944(), ["GEMINI_AUTH_USER_AGENT"]: rp_726566726573682e47454d494e495f415554485f555345525f4147454e54(), ["GEMINI_API_CLIENT"]: rp_726566726573682e47454d494e495f4150495f434c49454e54(), ["CLAUDE_CLIENT_ID"]: rp_726566726573682e434c415544455f434c49454e545f4944(), ["CLAUDE_TOKEN_URL"]: rp_726566726573682e434c415544455f544f4b454e5f55524c(), ["RefreshStatusClass"]: Object.freeze({ ["InvalidGrant"]: ml_make_RefreshStatusClass_InvalidGrant, ["InvalidClient"]: ml_make_RefreshStatusClass_InvalidClient, ["UnauthorizedClient"]: ml_make_RefreshStatusClass_UnauthorizedClient, ["UnsupportedGrantType"]: ml_make_RefreshStatusClass_UnsupportedGrantType, ["RateLimited"]: ml_make_RefreshStatusClass_RateLimited, ["ClientRejected"]: ml_make_RefreshStatusClass_ClientRejected, ["Transient"]: ml_make_RefreshStatusClass_Transient, ["UnexpectedStatus"]: ml_make_RefreshStatusClass_UnexpectedStatus }), ["ImportRefreshFailureKind"]: Object.freeze({ ["NotAttempted"]: ml_make_ImportRefreshFailureKind_NotAttempted, ["ExchangeRejected"]: ml_make_ImportRefreshFailureKind_ExchangeRejected, ["ExchangeUncertain"]: ml_make_ImportRefreshFailureKind_ExchangeUncertain, ["PersistenceUncertain"]: ml_make_ImportRefreshFailureKind_PersistenceUncertain }), ["CredentialEvidence"]: Object.freeze({ ["Working"]: ml_make_CredentialEvidence_Working, ["Rejected"]: ml_make_CredentialEvidence_Rejected }) };
export const provenance = {"sourcePath":"src/refresh.rs","sourceSha256":"dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108","executable":16,"executableFunctions":0,"executableConstants":12,"executableTypes":4,"executableConstructors":16,"carried":50,"preserved":67,"runtimeParity":false};
