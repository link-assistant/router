// Generated draft from src/vk.rs; sha256=89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function API_VERSION() {
  return "5.199";
}

function WAIT_SECS() {
  return 25n;
}

function CHAT_PEER_OFFSET() {
  return 2000000000n;
}

function is_private(peer_id, from_id) {
  ml_fixed(peer_id, -9223372036854775808n, 9223372036854775807n, "i64 argument peer_id out of range");
  if (!(typeof peer_id === 'bigint' && peer_id >= -9223372036854775808n && peer_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(from_id, -9223372036854775808n, 9223372036854775807n, "i64 argument from_id out of range");
  if (!(typeof from_id === 'bigint' && from_id >= -9223372036854775808n && from_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return (((peer_id === from_id) && (from_id > 0n)) && (peer_id < CHAT_PEER_OFFSET()));
}

export const translated = { "API_VERSION": API_VERSION(), "WAIT_SECS": WAIT_SECS(), "CHAT_PEER_OFFSET": CHAT_PEER_OFFSET(), is_private };
export const provenance = {"sourcePath":"src/vk.rs","sourceSha256":"89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27","executable":4,"executableFunctions":1,"executableConstants":3,"carried":13,"preserved":18,"runtimeParity":false};
