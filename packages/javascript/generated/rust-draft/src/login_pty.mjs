// Generated draft from src/login_pty.rs; sha256=ce27eba647479e2a4f909b90f05de08cd212284797706fe7220e8c56d19ebe22
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_d5cb32245d4cbec63e7142460f1766afc5cbbe22f7e03fc49c35d8db29f43964 = {"schemaVersion":1,"types":{"RouterOption_3_u32":{"kind":"data","name":"RouterOption_3_u32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_d5cb32245d4cbec63e7142460f1766afc5cbbe22f7e03fc49c35d8db29f43964 = new Map([]);

function PTY_COLS() {
  return 400n;
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

function PTY_ROWS() {
  return 60n;
}

function rp_6c6f67696e5f7074792e504f4c4c5f494e54455256414c() {
  return ml_host_std_time_duration_from_millis(50n);
}

function ml_make_WaitError_Timeout() {
  return Object.freeze({ $: 'Timeout' });
}

function ml_make_WaitError_ChildExited(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"RouterOption_3_u32"}, ml_host_value_schema_d5cb32245d4cbec63e7142460f1766afc5cbbe22f7e03fc49c35d8db29f43964, { refinements: ml_host_value_refinements_d5cb32245d4cbec63e7142460f1766afc5cbbe22f7e03fc49c35d8db29f43964 });
  return Object.freeze({ $: 'ChildExited', field0: field0 });
}

function ml_make_Key_Enter() {
  return Object.freeze({ $: 'Enter' });
}

function ml_make_Key_Escape() {
  return Object.freeze({ $: 'Escape' });
}

function ml_make_Key_CtrlC() {
  return Object.freeze({ $: 'CtrlC' });
}

export const translated = { ["PTY_COLS"]: PTY_COLS(), ["PTY_ROWS"]: PTY_ROWS(), ["POLL_INTERVAL"]: rp_6c6f67696e5f7074792e504f4c4c5f494e54455256414c(), ["WaitError"]: Object.freeze({ ["Timeout"]: ml_make_WaitError_Timeout, ["ChildExited"]: ml_make_WaitError_ChildExited }), ["Key"]: Object.freeze({ ["Enter"]: ml_make_Key_Enter, ["Escape"]: ml_make_Key_Escape, ["CtrlC"]: ml_make_Key_CtrlC }) };
export const provenance = {"sourcePath":"src/login_pty.rs","sourceSha256":"ce27eba647479e2a4f909b90f05de08cd212284797706fe7220e8c56d19ebe22","executable":5,"executableFunctions":0,"executableConstants":3,"executableTypes":2,"executableConstructors":5,"carried":14,"preserved":20,"runtimeParity":false};
