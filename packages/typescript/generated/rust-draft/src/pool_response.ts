// Generated draft from src/pool_response.rs; sha256=85526521da0b9dc965513ed08e79e05aef2e5b9ce48847404bacd313d4c12b14
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_ERROR_BYTES() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_ERROR_BYTES": bigint } = { "MAX_ERROR_BYTES": MAX_ERROR_BYTES() };
export const provenance = {"sourcePath":"src/pool_response.rs","sourceSha256":"85526521da0b9dc965513ed08e79e05aef2e5b9ce48847404bacd313d4c12b14","executable":1,"carried":5,"preserved":7,"runtimeParity":false};
