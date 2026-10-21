
// Generated draft from rust/src/conversation_record.rs; sha256=cf96bf48f750195cca7a59f43035a151b23e3399a9c0ed9be052971d372eb2ea
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_636f6e766572736174696f6e5f7265636f72642e5245434f52445f454e56(): string {
  return "CONVERSATION_RECORD";
}

function rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f454e56(): string {
  return "CONVERSATION_REPLAY";
}

function rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f5455524e5f484541444552(): string {
  return "x-router-replay-turn";
}

function rp_636f6e766572736174696f6e5f7265636f72642e52454652414d45445f48454144455253(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["content-length", "transfer-encoding", "connection", "date"]));
}

function rp_636f6e766572736174696f6e5f7265636f72642e4d41585f5245434f524445445f424f4459(): bigint {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "RECORD_ENV": string; "REPLAY_ENV": string; "REPLAY_TURN_HEADER": string; "REFRAMED_HEADERS": ReadonlyArray<string>; "MAX_RECORDED_BODY": bigint } = { ["RECORD_ENV"]: rp_636f6e766572736174696f6e5f7265636f72642e5245434f52445f454e56(), ["REPLAY_ENV"]: rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f454e56(), ["REPLAY_TURN_HEADER"]: rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f5455524e5f484541444552(), ["REFRAMED_HEADERS"]: rp_636f6e766572736174696f6e5f7265636f72642e52454652414d45445f48454144455253(), ["MAX_RECORDED_BODY"]: rp_636f6e766572736174696f6e5f7265636f72642e4d41585f5245434f524445445f424f4459() };
export const provenance = {"sourcePath":"rust/src/conversation_record.rs","sourceSha256":"cf96bf48f750195cca7a59f43035a151b23e3399a9c0ed9be052971d372eb2ea","executable":5,"executableFunctions":0,"executableConstants":5,"executableTypes":0,"executableConstructors":0,"carried":29,"preserved":35,"runtimeParity":false};
