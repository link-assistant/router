// Generated draft from src/vk.rs; sha256=89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_766b2e4150495f56455253494f4e() {
  return "5.199";
}

function rp_766b2e574149545f53454353() {
  return 25n;
}

function rp_766b2e4552524f525f4241434b4f4646() {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_766b2e434841545f504545525f4f4646534554() {
  return 2000000000n;
}

function ml_make_LongPollServer_LongPollServer(server, key, ts) {
  if (!(typeof server === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(server))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof key === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(key))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof ts === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(ts))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "LongPollServer", ["server"]: server, ["key"]: key, ["ts"]: ts });
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

function rp_766b2e69735f70726976617465(peer_id, from_id) {
  ml_fixed(peer_id, -9223372036854775808n, 9223372036854775807n, "i64 argument peer_id out of range");
  if (!(typeof peer_id === 'bigint' && peer_id >= -9223372036854775808n && peer_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(from_id, -9223372036854775808n, 9223372036854775807n, "i64 argument from_id out of range");
  if (!(typeof from_id === 'bigint' && from_id >= -9223372036854775808n && from_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return (((peer_id === from_id) && (from_id > 0n)) && (peer_id < rp_766b2e434841545f504545525f4f4646534554()));
}

export const translated = { ["API_VERSION"]: rp_766b2e4150495f56455253494f4e(), ["WAIT_SECS"]: rp_766b2e574149545f53454353(), ["ERROR_BACKOFF"]: rp_766b2e4552524f525f4241434b4f4646(), ["CHAT_PEER_OFFSET"]: rp_766b2e434841545f504545525f4f4646534554(), ["LongPollServer"]: ml_make_LongPollServer_LongPollServer, ["is_private"]: rp_766b2e69735f70726976617465 };
export const provenance = {"sourcePath":"src/vk.rs","sourceSha256":"89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27","executable":6,"executableFunctions":1,"executableConstants":4,"executableTypes":1,"executableConstructors":1,"carried":11,"preserved":18,"runtimeParity":false};
