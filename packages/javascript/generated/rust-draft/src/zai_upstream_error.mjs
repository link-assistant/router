// Generated draft from src/zai_upstream_error.rs; sha256=a4efc0de6d38d5bd7ba17a31d0d078145435ffe45f908f1ee7868337e9c0e023
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_7a61695f757073747265616d5f6572726f722e4558484155535445445f434f444553() {
  return Object.freeze(Object.freeze([1113n, 1309n, 1310n, 1311n, 1314n, 1315n, 1316n, 1317n, 1318n, 1319n, 1320n, 1321n]));
}

function rp_7a61695f757073747265616d5f6572726f722e4d41585f434c41535349464945445f424f4459() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_7a61695f757073747265616d5f6572726f722e53544154455f46494c45() {
  return "provider-exhaustion.json";
}

export const translated = { ["EXHAUSTED_CODES"]: rp_7a61695f757073747265616d5f6572726f722e4558484155535445445f434f444553(), ["MAX_CLASSIFIED_BODY"]: rp_7a61695f757073747265616d5f6572726f722e4d41585f434c41535349464945445f424f4459(), ["STATE_FILE"]: rp_7a61695f757073747265616d5f6572726f722e53544154455f46494c45() };
export const provenance = {"sourcePath":"src/zai_upstream_error.rs","sourceSha256":"a4efc0de6d38d5bd7ba17a31d0d078145435ffe45f908f1ee7868337e9c0e023","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":19,"preserved":23,"runtimeParity":false};
