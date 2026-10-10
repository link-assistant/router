// Generated draft from src/conversation_record.rs; sha256=26ed5ebc7c6884e578253a9c5f714c9c4cc1e96a15d3e50506ff0d162e64bd49
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function RECORD_ENV() {
  return "CONVERSATION_RECORD";
}

function REPLAY_ENV() {
  return "CONVERSATION_REPLAY";
}

function REPLAY_TURN_HEADER() {
  return "x-router-replay-turn";
}

function MAX_RECORDED_BODY() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "RECORD_ENV": string; "REPLAY_ENV": string; "REPLAY_TURN_HEADER": string; "MAX_RECORDED_BODY": bigint } = { "RECORD_ENV": RECORD_ENV(), "REPLAY_ENV": REPLAY_ENV(), "REPLAY_TURN_HEADER": REPLAY_TURN_HEADER(), "MAX_RECORDED_BODY": MAX_RECORDED_BODY() };
export const provenance = {"sourcePath":"src/conversation_record.rs","sourceSha256":"26ed5ebc7c6884e578253a9c5f714c9c4cc1e96a15d3e50506ff0d162e64bd49","executable":4,"executableFunctions":0,"executableConstants":4,"carried":30,"preserved":35,"runtimeParity":false};
