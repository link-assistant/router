// Generated draft from tests/emergency_auth_test.rs; sha256=59e899de3de71eea5b9bee1967e244251c1219b8eebcdd30a0c8fef465e19a8a
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "emergency-test-secret";
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

function ADMIN_KEY() {
  return "emergency-admin-key";
}

function CLIENT_ROUTE() {
  return "/api/models";
}

function CLAUDE_USER_AGENT() {
  return "claude-cli/2.0.0 (external, cli)";
}

function carriers(token) {
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze([Object.freeze({ $: 'Tuple', field0: "authorization", field1: (() => {
    const ml_fmt_1 = token;
    return ("Bearer " + ml_fmt_1);
  })() }), Object.freeze({ $: 'Tuple', field0: "x-api-key", field1: token }), Object.freeze({ $: 'Tuple', field0: "x-goog-api-key", field1: token })]);
}

export const translated = { ["SECRET"]: SECRET(), ["ADMIN_KEY"]: ADMIN_KEY(), ["CLIENT_ROUTE"]: CLIENT_ROUTE(), ["CLAUDE_USER_AGENT"]: CLAUDE_USER_AGENT(), ["carriers"]: carriers };
export const provenance = {"sourcePath":"tests/emergency_auth_test.rs","sourceSha256":"59e899de3de71eea5b9bee1967e244251c1219b8eebcdd30a0c8fef465e19a8a","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":39,"preserved":45,"runtimeParity":false};
