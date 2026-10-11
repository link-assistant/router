// Generated draft from src/chat_admin.rs; sha256=2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  if (option) {
    if (value.$ === 'Some') return value.field0;
  } else if (value.$ === 'Ok') return value.field0;
  return fallback;
}

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

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

function ml_make_ChatChannel_Telegram() {
  return Object.freeze({ $: 'Telegram' });
}

function ml_make_ChatChannel_Vk() {
  return Object.freeze({ $: 'Vk' });
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

export const translated = { ["DEFAULT_SECRET_TTL_SECS"]: rp_636861745f61646d696e2e44454641554c545f5345435245545f54544c5f53454353(), ["DEFAULT_RATE_LIMIT_PER_MINUTE"]: rp_636861745f61646d696e2e44454641554c545f524154455f4c494d49545f5045525f4d494e555445(), ["RATE_LIMIT_WINDOW"]: rp_636861745f61646d696e2e524154455f4c494d49545f57494e444f57(), ["ChatChannel"]: Object.freeze({ ["Telegram"]: ml_make_ChatChannel_Telegram, ["Vk"]: ml_make_ChatChannel_Vk }), ["Reply"]: ml_make_Reply_Reply, ["SESSION_IDLE_TTL"]: rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c(), ["MAX_SESSIONS"]: rp_636861745f61646d696e2e4d41585f53455353494f4e53(), ["normalise"]: rp_636861745f61646d696e2e6e6f726d616c697365, ["ALREADY_CLAIMED"]: rp_636861745f61646d696e2e414c52454144595f434c41494d4544(), ["RATE_LIMITED"]: rp_636861745f61646d696e2e524154455f4c494d49544544(), ["HELP"]: rp_636861745f61646d696e2e48454c50() };
export const provenance = {"sourcePath":"src/chat_admin.rs","sourceSha256":"2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd","executable":11,"executableFunctions":1,"executableConstants":8,"executableTypes":2,"executableConstructors":3,"carried":19,"preserved":31,"runtimeParity":false};
