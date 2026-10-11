// Generated draft from src/verification.rs; sha256=839dc354baff84b057fd6ec5c84d1f52d9dd4e0ed657843626a500425ef2ffa4
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

const ml_host_value_schema_841ec3c7b1648d6aeb3f331f9810ad48d21abbae813db29edde9aae99fd9f31b = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"Run":{"kind":"data","name":"Run","ctors":[{"name":"Run","fields":[{"name":"targets","type":{"kind":"array","element":{"kind":"string"}}},{"name":"unit","type":{"kind":"array","element":{"kind":"string"}}},{"name":"filter","type":{"kind":"data","name":"RouterOption_6_string"}},{"name":"serial","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_841ec3c7b1648d6aeb3f331f9810ad48d21abbae813db29edde9aae99fd9f31b = new Map([]);

function SCHEMA() {
  return "link-assistant-router/verification/v1";
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

function SKIP_LOG() {
  return "ROUTER_VERIFICATION_SKIPS";
}

function ml_make_Run_Run(targets, unit_2, filter, serial) {
  if (!ml_router_array(targets, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(unit_2, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(filter, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (!(typeof serial === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Run", ["targets"]: targets, ["unit"]: unit_2, ["filter"]: filter, ["serial"]: serial });
}

function ml_make_Area_Area(name, covers, enable, runs) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof covers === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(covers))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof enable === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(enable))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(runs, {"kind":"array","element":{"kind":"data","name":"Run"}}, ml_host_value_schema_841ec3c7b1648d6aeb3f331f9810ad48d21abbae813db29edde9aae99fd9f31b, { refinements: ml_host_value_refinements_841ec3c7b1648d6aeb3f331f9810ad48d21abbae813db29edde9aae99fd9f31b });
  return Object.freeze({ $: "Area", ["name"]: name, ["covers"]: covers, ["enable"]: enable, ["runs"]: runs });
}

function tests(targets) {
  if (!ml_router_array(targets, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = targets;
  const ml_record2 = Object.freeze([]);
  const ml_record3 = Object.freeze({ $: 'None' });
  const ml_record4 = false;
  return Object.freeze({ $: "Run", ["targets"]: ml_record1, ["unit"]: ml_record2, ["filter"]: ml_record3, ["serial"]: ml_record4 });
}

function unit(unit_2, filter) {
  if (!ml_router_array(unit_2, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof filter === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(filter))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = Object.freeze([]);
  const ml_record2 = unit_2;
  const ml_record3 = Object.freeze({ $: 'Some', field0: filter });
  const ml_record4 = false;
  return Object.freeze({ $: "Run", ["targets"]: ml_record1, ["unit"]: ml_record2, ["filter"]: ml_record3, ["serial"]: ml_record4 });
}

function AREAS() {
  return Object.freeze([(() => {
    const ml_record1 = "catalogs";
    const ml_record2 = "token-authorized /api/models and /v1/models: entitlement filtering, synthetic and namespaced rows, credential carriers, split origins, live provider catalogs";
    const ml_record3 = "LEFINE_API_KEY for the live catalog";
    const ml_record4 = Object.freeze([tests(Object.freeze(["credential_carrier_test", "synthetic_catalog_test", "gemini_namespace_test", "clients_split_origins_test", "client_ownership_test", "managed_server_test", "lefine_live_test"])), unit(Object.freeze(["--lib"]), "model_catalog")]);
    return Object.freeze({ $: "Area", ["name"]: ml_record1, ["covers"]: ml_record2, ["enable"]: ml_record3, ["runs"]: ml_record4 });
  })(), (() => {
    const ml_record5 = "real-clients";
    const ml_record6 = "Claude Code, Codex and OpenCode real binaries against a loopback Router, plus the separately gated host CLI lifecycle";
    const ml_record7 = "ROUTER_REAL_CLIENT_TESTS=1 with the vendor CLIs on PATH; ROUTER_HOST_CLI_TESTS=1 with ROUTER_HOST_CLI_URL and ROUTER_HOST_CLI_TOKEN";
    const ml_record8 = Object.freeze([(() => {
      const ml_record9 = Object.freeze(["real_clients_test", "host_client_lifecycle_test"]);
      const ml_record10 = Object.freeze([]);
      const ml_record11 = Object.freeze({ $: 'None' });
      const ml_record12 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record9, ["unit"]: ml_record10, ["filter"]: ml_record11, ["serial"]: ml_record12 });
    })()]);
    return Object.freeze({ $: "Area", ["name"]: ml_record5, ["covers"]: ml_record6, ["enable"]: ml_record7, ["runs"]: ml_record8 });
  })(), (() => {
    const ml_record13 = "zai-only-entitlements";
    const ml_record14 = "a token entitled only to z.ai: catalog rows, Claude and Codex launch profiles, pinned selection, usage normalization";
    const ml_record15 = "ROUTER_LIVE_ZAI_API_KEY (and ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST=1 for the billed probe)";
    const ml_record16 = Object.freeze([tests(Object.freeze(["with_router_test", "clients_cli_test", "live_model_selection_test", "subscription_usage_live_test"])), unit(Object.freeze(["--lib"]), "with_command")]);
    return Object.freeze({ $: "Area", ["name"]: ml_record13, ["covers"]: ml_record14, ["enable"]: ml_record15, ["runs"]: ml_record16 });
  })(), (() => {
    const ml_record17 = "anthropic-mock-contracts";
    const ml_record18 = "Anthropic-enabled and mixed entitlements: native Anthropic surfaces, cross-vendor translation, Claude picker rows";
    const ml_record19 = "nothing; mocked protocol and authorization contracts only";
    const ml_record20 = Object.freeze([tests(Object.freeze(["router_e2e_test", "cross_vendor_translation_test", "claude_auth_test"])), unit(Object.freeze(["--lib"]), "with_command")]);
    return Object.freeze({ $: "Area", ["name"]: ml_record17, ["covers"]: ml_record18, ["enable"]: ml_record19, ["runs"]: ml_record20 });
  })(), (() => {
    const ml_record21 = "anthropic-entitlements";
    const ml_record22 = "live personal Anthropic and z.ai union catalog, actual Claude picker, exact model identities and successful real responses through a single-owner serving Router";
    const ml_record23 = "ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON, ROUTER_LIVE_MIXED_URL, ROUTER_LIVE_MIXED_TOKEN and ROUTER_LIVE_MIXED_INFERENCE=1; a safe OS boundary and installed Claude";
    const ml_record24 = Object.freeze([(() => {
      const ml_record25 = Object.freeze(["mixed_entitlements_live_test", "subscription_usage_live_test"]);
      const ml_record26 = Object.freeze([]);
      const ml_record27 = Object.freeze({ $: 'None' });
      const ml_record28 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record25, ["unit"]: ml_record26, ["filter"]: ml_record27, ["serial"]: ml_record28 });
    })()]);
    return Object.freeze({ $: "Area", ["name"]: ml_record21, ["covers"]: ml_record22, ["enable"]: ml_record23, ["runs"]: ml_record24 });
  })(), (() => {
    const ml_record29 = "request-logs";
    const ml_record30 = "request logging, denied-request records, `router logs`, log format migration, conversation records";
    const ml_record31 = "nothing";
    const ml_record32 = Object.freeze([tests(Object.freeze(["request_logging_test", "request_log_line_test", "denied_request_logging_test", "logs_command_test", "log_format_migration_test", "conversation_record_test"]))]);
    return Object.freeze({ $: "Area", ["name"]: ml_record29, ["covers"]: ml_record30, ["enable"]: ml_record31, ["runs"]: ml_record32 });
  })(), (() => {
    const ml_record33 = "backup-reset-restore";
    const ml_record34 = "client profile backup, reset and restore, active-profile tracking and maintenance";
    const ml_record35 = "nothing";
    const ml_record36 = Object.freeze([tests(Object.freeze(["clients_lifecycle_test", "clients_maintenance_test", "clients_active_profile_test"]))]);
    return Object.freeze({ $: "Area", ["name"]: ml_record33, ["covers"]: ml_record34, ["enable"]: ml_record35, ["runs"]: ml_record36 });
  })(), (() => {
    const ml_record37 = "rolling-updates";
    const ml_record38 = "`router deploy`: candidate-first updates that drain streams, TOKEN_SECRET continuity, relay rotation, inconsistent-state recovery, host mode";
    const ml_record39 = "a container runtime and ROUTER_DEPLOY_TEST_IMAGE (plus ROUTER_DEPLOY_TEST_PREVIOUS_IMAGE for relay rotation)";
    const ml_record40 = Object.freeze([unit(Object.freeze(["--lib"]), "deploy_local"), (() => {
      const ml_record41 = Object.freeze(["deploy_host_test", "deploy_docker_test", "deploy_docker_secret_test", "deploy_docker_relay_test", "deploy_docker_claude_share_test", "deploy_docker_host_test"]);
      const ml_record42 = Object.freeze([]);
      const ml_record43 = Object.freeze({ $: 'None' });
      const ml_record44 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record41, ["unit"]: ml_record42, ["filter"]: ml_record43, ["serial"]: ml_record44 });
    })()]);
    return Object.freeze({ $: "Area", ["name"]: ml_record37, ["covers"]: ml_record38, ["enable"]: ml_record39, ["runs"]: ml_record40 });
  })(), (() => {
    const ml_record45 = "deploy-configuration";
    const ml_record46 = "`router deploy --config`: declarative TOML, runtime env passthrough and its fingerprint, instance names, SSH port/identity/pinned known_hosts/keepalive/deadline, deploy token policy, `--provider-key` validation modes, verification profiles and the `--json` document";
    const ml_record47 = "nothing; a stand-in ssh records the session";
    const ml_record48 = Object.freeze([tests(Object.freeze(["deploy_config_test"])), unit(Object.freeze(["--lib"]), "deploy_config"), unit(Object.freeze(["--lib"]), "deploy_remote")]);
    return Object.freeze({ $: "Area", ["name"]: ml_record45, ["covers"]: ml_record46, ["enable"]: ml_record47, ["runs"]: ml_record48 });
  })(), (() => {
    const ml_record49 = "staging";
    const ml_record50 = "independent disposable primary/candidate Docker namespaces, live GLM stream continuity, real Claude flagship/Flash responses and picker, isolated logs, retained primary tokens/profile/sessions/catalog";
    const ml_record51 = "ROUTER_STAGING_LIVE_TESTS=1, ROUTER_STAGING_DISPOSABLE_HOST=1, ROUTER_STAGING_ZAI_API_KEY, ROUTER_DEPLOY_TEST_IMAGE and installed Claude; static key only, no copied OAuth";
    const ml_record52 = Object.freeze([(() => {
      const ml_record53 = Object.freeze(["staging_live_test"]);
      const ml_record54 = Object.freeze([]);
      const ml_record55 = Object.freeze({ $: 'None' });
      const ml_record56 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record53, ["unit"]: ml_record54, ["filter"]: ml_record55, ["serial"]: ml_record56 });
    })()]);
    return Object.freeze({ $: "Area", ["name"]: ml_record49, ["covers"]: ml_record50, ["enable"]: ml_record51, ["runs"]: ml_record52 });
  })()]);
}

export const translated = { ["SCHEMA"]: SCHEMA(), ["SKIP_LOG"]: SKIP_LOG(), ["Run"]: ml_make_Run_Run, ["Area"]: ml_make_Area_Area, ["tests"]: tests, ["unit"]: unit, ["AREAS"]: AREAS() };
export const provenance = {"sourcePath":"src/verification.rs","sourceSha256":"839dc354baff84b057fd6ec5c84d1f52d9dd4e0ed657843626a500425ef2ffa4","executable":7,"executableFunctions":2,"executableConstants":3,"executableTypes":2,"executableConstructors":2,"carried":26,"preserved":34,"runtimeParity":false};
