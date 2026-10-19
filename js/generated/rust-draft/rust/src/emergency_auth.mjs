// Generated draft from rust/src/emergency_auth.rs; sha256=798d47b02d782643d57e698443bb2620cf014fdb7b3eb10fc5328e7b14248509
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_656d657267656e63795f617574682e464c4147() {
  return "--emergency-accept-any-token";
}

function rp_656d657267656e63795f617574682e454e56() {
  return "EMERGENCY_ACCEPT_ANY_TOKEN";
}

function rp_656d657267656e63795f617574682e414c4c4f575f4e4f4e5f4c4f4f504241434b5f454e56() {
  return "EMERGENCY_ALLOW_NON_LOOPBACK";
}

function rp_656d657267656e63795f617574682e4455524154494f4e5f454e56() {
  return "EMERGENCY_DURATION_MINUTES";
}

function rp_656d657267656e63795f617574682e454e565f56415253() {
  return ml_copy_fixed_array([rp_656d657267656e63795f617574682e454e56(), rp_656d657267656e63795f617574682e414c4c4f575f4e4f4e5f4c4f4f504241434b5f454e56(), rp_656d657267656e63795f617574682e4455524154494f4e5f454e56()], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

function rp_656d657267656e63795f617574682e44454641554c545f4455524154494f4e5f4d494e55544553() {
  return 60n;
}

function rp_656d657267656e63795f617574682e4d41585f4455524154494f4e5f4d494e55544553() {
  return ml_fixed((24n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_656d657267656e63795f617574682e5355424a4543545f505245464958() {
  return "emergency-bypass-";
}

function rp_656d657267656e63795f617574682e4c4142454c() {
  return "emergency-bypass";
}

function rp_656d657267656e63795f617574682e4845414c54485f484541444552() {
  return "x-link-assistant-emergency-auth";
}

function ml_make_EmergencyAuthConfig_EmergencyAuthConfig(enabled, allow_non_loopback, duration_minutes) {
  if (!(typeof enabled === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof allow_non_loopback === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (typeof duration_minutes !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(duration_minutes, 0n, 18446744073709551615n, "u64 argument duration_minutes out of range");
  if (!(typeof duration_minutes === 'bigint' && duration_minutes >= 0n && duration_minutes <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "EmergencyAuthConfig", ["enabled"]: enabled, ["allow_non_loopback"]: allow_non_loopback, ["duration_minutes"]: duration_minutes });
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

function rp_656d657267656e63795f617574682e69735f73796e7468657469635f6964(token_id) {
  if (!(typeof token_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_id))) throw new TypeError('argument outside supported Rust value domain');
  const ml_text_1 = token_id;
  const ml_text_2 = rp_656d657267656e63795f617574682e5355424a4543545f505245464958();
  return ml_text_1.startsWith(ml_text_2);
}

export const translated = { ["FLAG"]: rp_656d657267656e63795f617574682e464c4147(), ["ENV"]: rp_656d657267656e63795f617574682e454e56(), ["ALLOW_NON_LOOPBACK_ENV"]: rp_656d657267656e63795f617574682e414c4c4f575f4e4f4e5f4c4f4f504241434b5f454e56(), ["DURATION_ENV"]: rp_656d657267656e63795f617574682e4455524154494f4e5f454e56(), ["ENV_VARS"]: rp_656d657267656e63795f617574682e454e565f56415253(), ["DEFAULT_DURATION_MINUTES"]: rp_656d657267656e63795f617574682e44454641554c545f4455524154494f4e5f4d494e55544553(), ["MAX_DURATION_MINUTES"]: rp_656d657267656e63795f617574682e4d41585f4455524154494f4e5f4d494e55544553(), ["SUBJECT_PREFIX"]: rp_656d657267656e63795f617574682e5355424a4543545f505245464958(), ["LABEL"]: rp_656d657267656e63795f617574682e4c4142454c(), ["HEALTH_HEADER"]: rp_656d657267656e63795f617574682e4845414c54485f484541444552(), ["EmergencyAuthConfig"]: ml_make_EmergencyAuthConfig_EmergencyAuthConfig, ["is_synthetic_id"]: rp_656d657267656e63795f617574682e69735f73796e7468657469635f6964 };
export const provenance = {"sourcePath":"rust/src/emergency_auth.rs","sourceSha256":"798d47b02d782643d57e698443bb2620cf014fdb7b3eb10fc5328e7b14248509","executable":12,"executableFunctions":1,"executableConstants":10,"executableTypes":1,"executableConstructors":1,"carried":19,"preserved":32,"runtimeParity":false};
