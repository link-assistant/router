// Generated draft from src/chat_admin.rs; sha256=2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function DEFAULT_SECRET_TTL_SECS() {
  return 120n;
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

function DEFAULT_RATE_LIMIT_PER_MINUTE() {
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

function ml_make_Reply_Reply(text, secret) {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof secret === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Reply", ["text"]: text, ["secret"]: secret });
}

function rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c() {
  return ml_host_std_time_duration_from_secs(3600n);
}

function MAX_SESSIONS() {
  return 512n;
}

function ALREADY_CLAIMED() {
  return "Administration of this router is already claimed (here, through the web UI, or by deployment configuration). Send `/auth <admin token>` with an admin credential.";
}

function RATE_LIMITED() {
  return "Too many attempts. Wait a minute and try again.";
}

function HELP() {
  return "Commands:\n/status — credential state, accounts and usage\n/tokens — list issued tokens (ids, labels and limits, never values)\n/issue [label] [ttl_hours] [max_requests] [key=value …] — issue a token;\n    options: label, ttl_hours, max_requests, max_tokens,\n    rate_limit_per_minute, account\n/show <id> — every constraint, counter and state for one token\n/rotate-token <id> [key=value …] — reissue a token, keeping its limits\n/revoke <id> — revoke a token\n/rotate — replace the admin credential\n/auth <token> — sign in with an admin credential\n/logout — forget the credential bound to this chat";
}

export const translated = { ["DEFAULT_SECRET_TTL_SECS"]: DEFAULT_SECRET_TTL_SECS(), ["DEFAULT_RATE_LIMIT_PER_MINUTE"]: DEFAULT_RATE_LIMIT_PER_MINUTE(), ["RATE_LIMIT_WINDOW"]: rp_636861745f61646d696e2e524154455f4c494d49545f57494e444f57(), ["ChatChannel"]: Object.freeze({ ["Telegram"]: ml_make_ChatChannel_Telegram, ["Vk"]: ml_make_ChatChannel_Vk }), ["Reply"]: ml_make_Reply_Reply, ["SESSION_IDLE_TTL"]: rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c(), ["MAX_SESSIONS"]: MAX_SESSIONS(), ["ALREADY_CLAIMED"]: ALREADY_CLAIMED(), ["RATE_LIMITED"]: RATE_LIMITED(), ["HELP"]: HELP() };
export const provenance = {"sourcePath":"src/chat_admin.rs","sourceSha256":"2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd","executable":10,"executableFunctions":0,"executableConstants":8,"executableTypes":2,"executableConstructors":3,"carried":20,"preserved":31,"runtimeParity":false};
