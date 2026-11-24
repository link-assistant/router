// Generated draft from rust/src/chat_admin.rs; sha256=65cb8c29169cb120953da3273f54b376a294f16d621eac1bafef485d3be6ccf3
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

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

const router_core_base64 = {

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

function rp_636861745f61646d696e2e414c52454144595f434c41494d4544() {
  return "Administration of this router is already claimed (here, through the web UI, or by deployment configuration). Send `/auth <admin token>` with an admin credential.";
}

function rp_636861745f61646d696e2e524154455f4c494d49544544() {
  return "Too many attempts. Wait a minute and try again.";
}

function rp_636861745f61646d696e2e48454c50() {
  return "Commands:\n/status — credential state, accounts and usage\n/tokens — list issued tokens (ids, labels and limits, never values)\n/issue [label] [ttl_hours] [max_requests] [key=value …] — issue a token;\n    options: label, ttl_hours, max_requests, max_tokens,\n    rate_limit_per_minute, account\n/show <id> — every constraint, counter and state for one token\n/rotate-token <id> [key=value …] — reissue a token, keeping its limits\n/revoke <id> — revoke a token\n/rotate — replace the admin credential\n/auth <token> — sign in with an admin credential\n/logout — forget the credential bound to this chat";
}

export const translated = { ["DEFAULT_SECRET_TTL_SECS"]: rp_636861745f61646d696e2e44454641554c545f5345435245545f54544c5f53454353(), ["DEFAULT_RATE_LIMIT_PER_MINUTE"]: rp_636861745f61646d696e2e44454641554c545f524154455f4c494d49545f5045525f4d494e555445(), ["RATE_LIMIT_WINDOW"]: rp_636861745f61646d696e2e524154455f4c494d49545f57494e444f57(), ["ChatChannel"]: Object.freeze({ ["Telegram"]: ml_make_ChatChannel_Telegram, ["Vk"]: ml_make_ChatChannel_Vk }), ["Reply"]: ml_make_Reply_Reply, ["SESSION_IDLE_TTL"]: rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c(), ["MAX_SESSIONS"]: rp_636861745f61646d696e2e4d41585f53455353494f4e53(), ["ALREADY_CLAIMED"]: rp_636861745f61646d696e2e414c52454144595f434c41494d4544(), ["RATE_LIMITED"]: rp_636861745f61646d696e2e524154455f4c494d49544544(), ["HELP"]: rp_636861745f61646d696e2e48454c50() };
export const provenance = {"sourcePath":"rust/src/chat_admin.rs","sourceSha256":"65cb8c29169cb120953da3273f54b376a294f16d621eac1bafef485d3be6ccf3","executable":10,"executableFunctions":0,"executableConstants":8,"executableTypes":2,"executableConstructors":3,"carried":20,"preserved":31,"runtimeParity":false};
