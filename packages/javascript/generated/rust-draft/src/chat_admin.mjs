// Generated draft from src/chat_admin.rs; sha256=2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs, std_time_duration_as_secs as ml_host_duration_as_secs } from "../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

const ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = new Map([]);

const ml_host_value_schema_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 = {"schemaVersion":1,"types":{"std.time.Duration":{"kind":"data","name":"std.time.Duration","ctors":[{"name":"Duration","fields":[{"name":"secs","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"nanos","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 = new Map([["std.time.Duration", ml_validate_duration]]);

function ml_validate_duration(value) { ml_host_duration_as_secs(value); return true; }

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_636861745f61646d696e2e44454641554c545f5345435245545f54544c5f53454353() {
  return 120n;
}

function rp_636861745f61646d696e2e44454641554c545f524154455f4c494d49545f5045525f4d494e555445() {
  return 5n;
}

function rp_636861745f61646d696e2e524154455f4c494d49545f57494e444f57() {
  return ml_host_std_time_duration_from_secs(60n);
}

function ml_make_ChatAdminConfig_ChatAdminConfig(telegram_bot_token, vk_bot_token, vk_group_id, secret_ttl, rate_limit_per_minute) {
  ml_validate_rust_value(telegram_bot_token, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(vk_bot_token, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(vk_group_id, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(secret_ttl, {"kind":"data","name":"std.time.Duration"}, ml_host_value_schema_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506, { refinements: ml_host_value_refinements_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 });
  if (typeof rate_limit_per_minute !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(rate_limit_per_minute, 0n, 4294967295n, "u32 argument rate_limit_per_minute out of range");
  if (!(typeof rate_limit_per_minute === 'bigint' && rate_limit_per_minute >= 0n && rate_limit_per_minute <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ChatAdminConfig", ["telegram_bot_token"]: telegram_bot_token, ["vk_bot_token"]: vk_bot_token, ["vk_group_id"]: vk_group_id, ["secret_ttl"]: secret_ttl, ["rate_limit_per_minute"]: rate_limit_per_minute });
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

function ml_make_ChatChannel_Telegram() {
  return Object.freeze({ $: 'Telegram' });
}

function ml_make_ChatChannel_Vk() {
  return Object.freeze({ $: 'Vk' });
}

function ml_make_Reply_Reply(text, secret) {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof secret === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Reply", ["text"]: text, ["secret"]: secret });
}

function rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c() {
  return ml_host_std_time_duration_from_secs(3600n);
}

function rp_636861745f61646d696e2e4d41585f53455353494f4e53() {
  return 512n;
}

function rp_636861745f61646d696e2e6e6f726d616c697365(word) {
  if (!(typeof word === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(word))) throw new TypeError('argument outside supported Rust value domain');
  const word_2 = ml_router_unwrap((() => {
    const ml_text_17 = word;
    const ml_text_18 = "/";
    return (ml_text_17.startsWith(ml_text_18)?Object.freeze({ $: 'Some', field0: ml_text_17.slice(ml_text_18.length) }):Object.freeze({ $: 'None' }));
  })(), word, true);
  const word_3 = ml_host_option_map_or((() => {
    const ml_text_25 = word_2;
    const ml_text_26 = "@";
    return (()=>{const index=ml_text_25.indexOf(ml_text_26);return index<0?Object.freeze({ $: 'None' }):Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: ml_text_25.slice(0,index), field1: ml_text_25.slice(index+ml_text_26.length) }) });})();
  })(), word_2, (ml_pattern_callback_27) => { ml_pattern_immutable(ml_pattern_callback_27);
  const name = (ml_pattern_callback_27)["field0"];
  return name; });
  return word_3.toLowerCase();
}

function rp_636861745f61646d696e2e414c52454144595f434c41494d4544() {
  return "Administration of this router is already claimed (here, through the web UI, or by deployment configuration). Send `/auth <admin token>` with an admin credential.";
}

function rp_636861745f61646d696e2e524154455f4c494d49544544() {
  return "Too many attempts. Wait a minute and try again.";
}

function rp_636861745f61646d696e2e48454c50() {
  return "Commands:\n/status — credential state, accounts and usage\n/tokens — list issued tokens (ids, labels and limits, never values)\n/issue [label] [ttl_hours] [max_requests] [key=value …] — issue a token;\n    options: label, ttl_hours, max_requests, max_tokens,\n    rate_limit_per_minute, account\n/show <id> — every constraint, counter and state for one token\n/rotate-token <id> [key=value …] — reissue a token, keeping its limits\n/revoke <id> — revoke a token\n/rotate — replace the admin credential\n/auth <token> — sign in with an admin credential\n/logout — forget the credential bound to this chat";
}

export const translated = { ["DEFAULT_SECRET_TTL_SECS"]: rp_636861745f61646d696e2e44454641554c545f5345435245545f54544c5f53454353(), ["DEFAULT_RATE_LIMIT_PER_MINUTE"]: rp_636861745f61646d696e2e44454641554c545f524154455f4c494d49545f5045525f4d494e555445(), ["RATE_LIMIT_WINDOW"]: rp_636861745f61646d696e2e524154455f4c494d49545f57494e444f57(), ["ChatAdminConfig"]: ml_make_ChatAdminConfig_ChatAdminConfig, ["ChatChannel"]: Object.freeze({ ["Telegram"]: ml_make_ChatChannel_Telegram, ["Vk"]: ml_make_ChatChannel_Vk }), ["Reply"]: ml_make_Reply_Reply, ["SESSION_IDLE_TTL"]: rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c(), ["MAX_SESSIONS"]: rp_636861745f61646d696e2e4d41585f53455353494f4e53(), ["normalise"]: rp_636861745f61646d696e2e6e6f726d616c697365, ["ALREADY_CLAIMED"]: rp_636861745f61646d696e2e414c52454144595f434c41494d4544(), ["RATE_LIMITED"]: rp_636861745f61646d696e2e524154455f4c494d49544544(), ["HELP"]: rp_636861745f61646d696e2e48454c50() };
export const provenance = {"sourcePath":"src/chat_admin.rs","sourceSha256":"2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd","executable":12,"executableFunctions":1,"executableConstants":8,"executableTypes":3,"executableConstructors":4,"carried":18,"preserved":31,"runtimeParity":false};
