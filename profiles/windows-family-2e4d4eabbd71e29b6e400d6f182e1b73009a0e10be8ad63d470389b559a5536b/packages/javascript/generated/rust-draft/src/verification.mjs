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

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_77e9e272f8f29a71e20f733cff09c2808a5814f87a6324efeac7f6879c7fffb2 = {"schemaVersion":1,"types":{"rp_766572696669636174696f6e2e436f756e7473":{"kind":"data","name":"rp_766572696669636174696f6e2e436f756e7473","ctors":[{"name":"Counts","fields":[{"name":"passed","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"failed","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"ignored","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_77e9e272f8f29a71e20f733cff09c2808a5814f87a6324efeac7f6879c7fffb2 = new Map([]);

import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_count(values) { let count = 0n; for (const value of values) { void value; count += 1n; } return count; }

function rp_766572696669636174696f6e2e534348454d41() {
  return "link-assistant-router/verification/v1";
}

function rp_766572696669636174696f6e2e534b49505f4c4f47() {
  return "ROUTER_VERIFICATION_SKIPS";
}

function ml_make_Run_Run(targets, unit_2, filter, serial) {
  if (!ml_router_array(targets, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(unit_2, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(filter, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (!(typeof serial === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Run", ["targets"]: targets, ["unit"]: unit_2, ["filter"]: filter, ["serial"]: serial });
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

function ml_make_Area_Area(name, covers, enable, runs) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof covers === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(covers))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof enable === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(enable))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(runs, {"kind":"array","element":{"kind":"data","name":"Run"}}, ml_host_value_schema_841ec3c7b1648d6aeb3f331f9810ad48d21abbae813db29edde9aae99fd9f31b, { refinements: ml_host_value_refinements_841ec3c7b1648d6aeb3f331f9810ad48d21abbae813db29edde9aae99fd9f31b });
  return Object.freeze({ $: "Area", ["name"]: name, ["covers"]: covers, ["enable"]: enable, ["runs"]: runs });
}

function rp_766572696669636174696f6e2e7465737473(targets) {
  if (!ml_router_array(targets, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = targets;
  const ml_record2 = Object.freeze(Object.freeze([]));
  const ml_record3 = Object.freeze({ $: 'None' });
  const ml_record4 = false;
  return Object.freeze({ $: "Run", ["targets"]: ml_record1, ["unit"]: ml_record2, ["filter"]: ml_record3, ["serial"]: ml_record4 });
}

function rp_766572696669636174696f6e2e756e6974(unit, filter) {
  if (!ml_router_array(unit, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof filter === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(filter))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = Object.freeze(Object.freeze([]));
  const ml_record2 = unit;
  const ml_record3 = Object.freeze({ $: 'Some', field0: filter });
  const ml_record4 = false;
  return Object.freeze({ $: "Run", ["targets"]: ml_record1, ["unit"]: ml_record2, ["filter"]: ml_record3, ["serial"]: ml_record4 });
}

function rp_766572696669636174696f6e2e4152454153() {
  return Object.freeze(Object.freeze([(() => {
    const ml_record1 = "catalogs";
    const ml_record2 = "token-authorized /api/models and /v1/models: entitlement filtering, synthetic and namespaced rows, credential carriers, split origins, live provider catalogs";
    const ml_record3 = "LEFINE_API_KEY for the live catalog";
    const ml_record4 = Object.freeze(Object.freeze([rp_766572696669636174696f6e2e7465737473(Object.freeze(Object.freeze(["credential_carrier_test", "synthetic_catalog_test", "gemini_namespace_test", "clients_split_origins_test", "client_ownership_test", "managed_server_test", "lefine_live_test"]))), rp_766572696669636174696f6e2e756e6974(Object.freeze(Object.freeze(["--lib"])), "model_catalog")]));
    return Object.freeze({ $: "Area", ["name"]: ml_record1, ["covers"]: ml_record2, ["enable"]: ml_record3, ["runs"]: ml_record4 });
  })(), (() => {
    const ml_record5 = "real-clients";
    const ml_record6 = "Claude Code, Codex and OpenCode real binaries against a loopback Router, plus the separately gated host CLI lifecycle";
    const ml_record7 = "ROUTER_REAL_CLIENT_TESTS=1 with the vendor CLIs on PATH; ROUTER_HOST_CLI_TESTS=1 with ROUTER_HOST_CLI_URL and ROUTER_HOST_CLI_TOKEN";
    const ml_record8 = Object.freeze(Object.freeze([(() => {
      const ml_record9 = Object.freeze(Object.freeze(["real_clients_test", "host_client_lifecycle_test"]));
      const ml_record10 = Object.freeze(Object.freeze([]));
      const ml_record11 = Object.freeze({ $: 'None' });
      const ml_record12 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record9, ["unit"]: ml_record10, ["filter"]: ml_record11, ["serial"]: ml_record12 });
    })()]));
    return Object.freeze({ $: "Area", ["name"]: ml_record5, ["covers"]: ml_record6, ["enable"]: ml_record7, ["runs"]: ml_record8 });
  })(), (() => {
    const ml_record13 = "zai-only-entitlements";
    const ml_record14 = "a token entitled only to z.ai: catalog rows, Claude and Codex launch profiles, pinned selection, usage normalization";
    const ml_record15 = "ROUTER_LIVE_ZAI_API_KEY (and ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST=1 for the billed probe)";
    const ml_record16 = Object.freeze(Object.freeze([rp_766572696669636174696f6e2e7465737473(Object.freeze(Object.freeze(["with_router_test", "clients_cli_test", "live_model_selection_test", "subscription_usage_live_test"]))), rp_766572696669636174696f6e2e756e6974(Object.freeze(Object.freeze(["--lib"])), "with_command")]));
    return Object.freeze({ $: "Area", ["name"]: ml_record13, ["covers"]: ml_record14, ["enable"]: ml_record15, ["runs"]: ml_record16 });
  })(), (() => {
    const ml_record17 = "anthropic-mock-contracts";
    const ml_record18 = "Anthropic-enabled and mixed entitlements: native Anthropic surfaces, cross-vendor translation, Claude picker rows";
    const ml_record19 = "nothing; mocked protocol and authorization contracts only";
    const ml_record20 = Object.freeze(Object.freeze([rp_766572696669636174696f6e2e7465737473(Object.freeze(Object.freeze(["router_e2e_test", "cross_vendor_translation_test", "claude_auth_test"]))), rp_766572696669636174696f6e2e756e6974(Object.freeze(Object.freeze(["--lib"])), "with_command")]));
    return Object.freeze({ $: "Area", ["name"]: ml_record17, ["covers"]: ml_record18, ["enable"]: ml_record19, ["runs"]: ml_record20 });
  })(), (() => {
    const ml_record21 = "anthropic-entitlements";
    const ml_record22 = "live personal Anthropic and z.ai union catalog, actual Claude picker, exact model identities and successful real responses through a single-owner serving Router";
    const ml_record23 = "ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON, ROUTER_LIVE_MIXED_URL, ROUTER_LIVE_MIXED_TOKEN and ROUTER_LIVE_MIXED_INFERENCE=1; a safe OS boundary and installed Claude";
    const ml_record24 = Object.freeze(Object.freeze([(() => {
      const ml_record25 = Object.freeze(Object.freeze(["mixed_entitlements_live_test", "subscription_usage_live_test"]));
      const ml_record26 = Object.freeze(Object.freeze([]));
      const ml_record27 = Object.freeze({ $: 'None' });
      const ml_record28 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record25, ["unit"]: ml_record26, ["filter"]: ml_record27, ["serial"]: ml_record28 });
    })()]));
    return Object.freeze({ $: "Area", ["name"]: ml_record21, ["covers"]: ml_record22, ["enable"]: ml_record23, ["runs"]: ml_record24 });
  })(), (() => {
    const ml_record29 = "request-logs";
    const ml_record30 = "request logging, denied-request records, `router logs`, log format migration, conversation records";
    const ml_record31 = "nothing";
    const ml_record32 = Object.freeze(Object.freeze([rp_766572696669636174696f6e2e7465737473(Object.freeze(Object.freeze(["request_logging_test", "request_log_line_test", "denied_request_logging_test", "logs_command_test", "log_format_migration_test", "conversation_record_test"])))]));
    return Object.freeze({ $: "Area", ["name"]: ml_record29, ["covers"]: ml_record30, ["enable"]: ml_record31, ["runs"]: ml_record32 });
  })(), (() => {
    const ml_record33 = "backup-reset-restore";
    const ml_record34 = "client profile backup, reset and restore, active-profile tracking and maintenance";
    const ml_record35 = "nothing";
    const ml_record36 = Object.freeze(Object.freeze([rp_766572696669636174696f6e2e7465737473(Object.freeze(Object.freeze(["clients_lifecycle_test", "clients_maintenance_test", "clients_active_profile_test"])))]));
    return Object.freeze({ $: "Area", ["name"]: ml_record33, ["covers"]: ml_record34, ["enable"]: ml_record35, ["runs"]: ml_record36 });
  })(), (() => {
    const ml_record37 = "rolling-updates";
    const ml_record38 = "`router deploy`: candidate-first updates that drain streams, TOKEN_SECRET continuity, relay rotation, inconsistent-state recovery, host mode";
    const ml_record39 = "a container runtime and ROUTER_DEPLOY_TEST_IMAGE (plus ROUTER_DEPLOY_TEST_PREVIOUS_IMAGE for relay rotation)";
    const ml_record40 = Object.freeze(Object.freeze([rp_766572696669636174696f6e2e756e6974(Object.freeze(Object.freeze(["--lib"])), "deploy_local"), (() => {
      const ml_record41 = Object.freeze(Object.freeze(["deploy_host_test", "deploy_docker_test", "deploy_docker_secret_test", "deploy_docker_relay_test", "deploy_docker_claude_share_test", "deploy_docker_host_test"]));
      const ml_record42 = Object.freeze(Object.freeze([]));
      const ml_record43 = Object.freeze({ $: 'None' });
      const ml_record44 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record41, ["unit"]: ml_record42, ["filter"]: ml_record43, ["serial"]: ml_record44 });
    })()]));
    return Object.freeze({ $: "Area", ["name"]: ml_record37, ["covers"]: ml_record38, ["enable"]: ml_record39, ["runs"]: ml_record40 });
  })(), (() => {
    const ml_record45 = "deploy-configuration";
    const ml_record46 = "`router deploy --config`: declarative TOML, runtime env passthrough and its fingerprint, instance names, SSH port/identity/pinned known_hosts/keepalive/deadline, deploy token policy, `--provider-key` validation modes, verification profiles and the `--json` document";
    const ml_record47 = "nothing; a stand-in ssh records the session";
    const ml_record48 = Object.freeze(Object.freeze([rp_766572696669636174696f6e2e7465737473(Object.freeze(Object.freeze(["deploy_config_test"]))), rp_766572696669636174696f6e2e756e6974(Object.freeze(Object.freeze(["--lib"])), "deploy_config"), rp_766572696669636174696f6e2e756e6974(Object.freeze(Object.freeze(["--lib"])), "deploy_remote")]));
    return Object.freeze({ $: "Area", ["name"]: ml_record45, ["covers"]: ml_record46, ["enable"]: ml_record47, ["runs"]: ml_record48 });
  })(), (() => {
    const ml_record49 = "staging";
    const ml_record50 = "independent disposable primary/candidate Docker namespaces, live GLM stream continuity, real Claude flagship/Flash responses and picker, isolated logs, retained primary tokens/profile/sessions/catalog";
    const ml_record51 = "ROUTER_STAGING_LIVE_TESTS=1, ROUTER_STAGING_DISPOSABLE_HOST=1, ROUTER_STAGING_ZAI_API_KEY, ROUTER_DEPLOY_TEST_IMAGE and installed Claude; static key only, no copied OAuth";
    const ml_record52 = Object.freeze(Object.freeze([(() => {
      const ml_record53 = Object.freeze(Object.freeze(["staging_live_test"]));
      const ml_record54 = Object.freeze(Object.freeze([]));
      const ml_record55 = Object.freeze({ $: 'None' });
      const ml_record56 = true;
      return Object.freeze({ $: "Run", ["targets"]: ml_record53, ["unit"]: ml_record54, ["filter"]: ml_record55, ["serial"]: ml_record56 });
    })()]));
    return Object.freeze({ $: "Area", ["name"]: ml_record49, ["covers"]: ml_record50, ["enable"]: ml_record51, ["runs"]: ml_record52 });
  })()]));
}

function ml_make_Counts_Counts(passed, failed, ignored) {
  if (typeof passed !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(passed, 0n, 18446744073709551615n, "u64 argument passed out of range");
  if (!(typeof passed === 'bigint' && passed >= 0n && passed <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof failed !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(failed, 0n, 18446744073709551615n, "u64 argument failed out of range");
  if (!(typeof failed === 'bigint' && failed >= 0n && failed <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof ignored !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(ignored, 0n, 18446744073709551615n, "u64 argument ignored out of range");
  if (!(typeof ignored === 'bigint' && ignored >= 0n && ignored <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Counts", ["passed"]: passed, ["failed"]: failed, ["ignored"]: ignored });
}

function rp_766572696669636174696f6e2e737461747573(succeeded, counts, skipped, not_run) {
  if (!(typeof succeeded === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(counts, {"kind":"data","name":"rp_766572696669636174696f6e2e436f756e7473"}, ml_host_value_schema_77e9e272f8f29a71e20f733cff09c2808a5814f87a6324efeac7f6879c7fffb2, { refinements: ml_host_value_refinements_77e9e272f8f29a71e20f733cff09c2808a5814f87a6324efeac7f6879c7fffb2 });
  if (typeof skipped !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(skipped, 0n, 18446744073709551615n, "u64 argument skipped out of range");
  if (!(typeof skipped === 'bigint' && skipped >= 0n && skipped <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof not_run !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(not_run, 0n, 18446744073709551615n, "u64 argument not_run out of range");
  if (!(typeof not_run === 'bigint' && not_run >= 0n && not_run <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if ((!succeeded || ((counts).failed > 0n))) {
    return "failed";
  } else {
    if (((((not_run > 0n) || (skipped > 0n)) || ((counts).ignored > 0n)) || ((counts).passed === 0n))) {
      return "not-proven";
    } else {
      return "proven";
    }
  }
}

function rp_766572696669636174696f6e2e726573756c7473(output) {
  if (!(typeof output === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(output))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_count(ml_router_filter(ml_str_lines(output), (line) => { const ml_text_5 = (line).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
  const ml_text_6 = "test result: ";
  return ml_text_5.startsWith(ml_text_6); }));
}

export const translated = { ["SCHEMA"]: rp_766572696669636174696f6e2e534348454d41(), ["SKIP_LOG"]: rp_766572696669636174696f6e2e534b49505f4c4f47(), ["Run"]: ml_make_Run_Run, ["Area"]: ml_make_Area_Area, ["tests"]: rp_766572696669636174696f6e2e7465737473, ["unit"]: rp_766572696669636174696f6e2e756e6974, ["AREAS"]: rp_766572696669636174696f6e2e4152454153(), ["Counts"]: ml_make_Counts_Counts, ["status"]: rp_766572696669636174696f6e2e737461747573, ["results"]: rp_766572696669636174696f6e2e726573756c7473 };
export const provenance = {"sourcePath":"src/verification.rs","sourceSha256":"839dc354baff84b057fd6ec5c84d1f52d9dd4e0ed657843626a500425ef2ffa4","executable":10,"executableFunctions":4,"executableConstants":3,"executableTypes":3,"executableConstructors":3,"carried":23,"preserved":34,"runtimeParity":false};
