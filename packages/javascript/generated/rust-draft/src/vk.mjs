// Generated draft from src/vk.rs; sha256=89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function API_VERSION() {
  return "5.199";
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

function WAIT_SECS() {
  return 25n;
}

function rp_766b2e4552524f525f4241434b4f4646() {
  return ml_host_std_time_duration_from_secs(5n);
}

function CHAT_PEER_OFFSET() {
  return 2000000000n;
}

function ml_make_LongPollServer_LongPollServer(server, key, ts) {
  if (!(typeof server === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(server))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof key === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(key))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof ts === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(ts))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "LongPollServer", ["server"]: server, ["key"]: key, ["ts"]: ts });
}

function is_private(peer_id, from_id) {
  ml_fixed(peer_id, -9223372036854775808n, 9223372036854775807n, "i64 argument peer_id out of range");
  if (!(typeof peer_id === 'bigint' && peer_id >= -9223372036854775808n && peer_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(from_id, -9223372036854775808n, 9223372036854775807n, "i64 argument from_id out of range");
  if (!(typeof from_id === 'bigint' && from_id >= -9223372036854775808n && from_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return (((peer_id === from_id) && (from_id > 0n)) && (peer_id < CHAT_PEER_OFFSET()));
}

export const translated = { ["API_VERSION"]: API_VERSION(), ["WAIT_SECS"]: WAIT_SECS(), ["ERROR_BACKOFF"]: rp_766b2e4552524f525f4241434b4f4646(), ["CHAT_PEER_OFFSET"]: CHAT_PEER_OFFSET(), ["LongPollServer"]: ml_make_LongPollServer_LongPollServer, ["is_private"]: is_private };
export const provenance = {"sourcePath":"src/vk.rs","sourceSha256":"89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27","executable":6,"executableFunctions":1,"executableConstants":4,"executableTypes":1,"executableConstructors":1,"carried":11,"preserved":18,"runtimeParity":false};
