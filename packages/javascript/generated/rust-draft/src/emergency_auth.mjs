// Generated draft from src/emergency_auth.rs; sha256=ebab1272b62f4aea43950d1b6f30189aec995e52330965df8f4dc00e0a5efe94
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

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

function rp_656d657267656e63795f617574682e5355424a4543545f505245464958() {
  return "emergency-bypass-";
}

function rp_656d657267656e63795f617574682e4c4142454c() {
  return "emergency-bypass";
}

function rp_656d657267656e63795f617574682e4845414c54485f484541444552() {
  return "x-link-assistant-emergency-auth";
}

export const translated = { ["FLAG"]: rp_656d657267656e63795f617574682e464c4147(), ["ENV"]: rp_656d657267656e63795f617574682e454e56(), ["ALLOW_NON_LOOPBACK_ENV"]: rp_656d657267656e63795f617574682e414c4c4f575f4e4f4e5f4c4f4f504241434b5f454e56(), ["DURATION_ENV"]: rp_656d657267656e63795f617574682e4455524154494f4e5f454e56(), ["ENV_VARS"]: rp_656d657267656e63795f617574682e454e565f56415253(), ["SUBJECT_PREFIX"]: rp_656d657267656e63795f617574682e5355424a4543545f505245464958(), ["LABEL"]: rp_656d657267656e63795f617574682e4c4142454c(), ["HEALTH_HEADER"]: rp_656d657267656e63795f617574682e4845414c54485f484541444552() };
export const provenance = {"sourcePath":"src/emergency_auth.rs","sourceSha256":"ebab1272b62f4aea43950d1b6f30189aec995e52330965df8f4dc00e0a5efe94","executable":8,"executableFunctions":0,"executableConstants":8,"executableTypes":0,"executableConstructors":0,"carried":23,"preserved":32,"runtimeParity":false};
