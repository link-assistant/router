// Generated draft from tests/real_clients_test.rs; sha256=fd2e46770b1877b0ef247986c5537a0a7ae3d121034ecc86416ce8cb1aca74d5
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

const ml_host_value_schema_7897d7f0c726e612ccdd23bd7b221da85c02ed76fedffb112fe173402d9bacc2 = {"schemaVersion":1,"types":{"RouterTuple_6_string_6_string":{"kind":"data","name":"RouterTuple_6_string_6_string","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_7897d7f0c726e612ccdd23bd7b221da85c02ed76fedffb112fe173402d9bacc2 = new Map([]);

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

function ml_make_CapturedRequest_CapturedRequest(method, path, headers, body) {
  if (!(typeof method === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(method))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(headers, {"kind":"array","element":{"kind":"data","name":"RouterTuple_6_string_6_string"},"patternOwnershipRefusal":"ownership-bearing Vec type"}, ml_host_value_schema_7897d7f0c726e612ccdd23bd7b221da85c02ed76fedffb112fe173402d9bacc2, { refinements: ml_host_value_refinements_7897d7f0c726e612ccdd23bd7b221da85c02ed76fedffb112fe173402d9bacc2 });
  if (!ml_router_array(body, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "CapturedRequest", ["method"]: method, ["path"]: path, ["headers"]: headers, ["body"]: body });
}

export const translated = { ["PROMPT"]: PROMPT(), ["SUBAGENT_PROMPT"]: SUBAGENT_PROMPT(), ["ANSWER"]: ANSWER(), ["CODEX_ALTERNATE_MODEL"]: CODEX_ALTERNATE_MODEL(), ["ClientCase"]: ml_make_ClientCase_ClientCase, ["CapturedRequest"]: ml_make_CapturedRequest_CapturedRequest };
export const provenance = {"sourcePath":"tests/real_clients_test.rs","sourceSha256":"fd2e46770b1877b0ef247986c5537a0a7ae3d121034ecc86416ce8cb1aca74d5","executable":6,"executableFunctions":0,"executableConstants":4,"executableTypes":2,"executableConstructors":2,"carried":53,"preserved":60,"runtimeParity":false};
