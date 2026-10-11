// Generated draft from tests/real_clients_test.rs; sha256=fd2e46770b1877b0ef247986c5537a0a7ae3d121034ecc86416ce8cb1aca74d5
// Carried constructs are data, never runtime parity evidence.
function PROMPT() {
  return "Reply with exactly ROUTER_CAPTURE_OK";
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

function SUBAGENT_PROMPT() {
  return "Use the Agent tool once, then reply ROUTER_CAPTURE_OK.";
}

function ANSWER() {
  return "ROUTER_CAPTURE_OK";
}

function CODEX_ALTERNATE_MODEL() {
  return "future-codex-switch-model";
}

function ml_make_ClientCase_ClientCase(client, executable, version, model, owner, catalog_path, inference_path, user_agent_prefix, credential_header) {
  if (!(typeof client === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(client))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof executable === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(executable))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof version === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(version))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof model === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(model))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof owner === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(owner))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof catalog_path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(catalog_path))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof inference_path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(inference_path))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof user_agent_prefix === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(user_agent_prefix))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof credential_header === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(credential_header))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ClientCase", ["client"]: client, ["executable"]: executable, ["version"]: version, ["model"]: model, ["owner"]: owner, ["catalog_path"]: catalog_path, ["inference_path"]: inference_path, ["user_agent_prefix"]: user_agent_prefix, ["credential_header"]: credential_header });
}

export const translated = { ["PROMPT"]: PROMPT(), ["SUBAGENT_PROMPT"]: SUBAGENT_PROMPT(), ["ANSWER"]: ANSWER(), ["CODEX_ALTERNATE_MODEL"]: CODEX_ALTERNATE_MODEL(), ["ClientCase"]: ml_make_ClientCase_ClientCase };
export const provenance = {"sourcePath":"tests/real_clients_test.rs","sourceSha256":"fd2e46770b1877b0ef247986c5537a0a7ae3d121034ecc86416ce8cb1aca74d5","executable":5,"executableFunctions":0,"executableConstants":4,"executableTypes":1,"executableConstructors":1,"carried":54,"preserved":60,"runtimeParity":false};
