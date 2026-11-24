// Generated draft from rust/tests/upstream_resilience_test.rs; sha256=c7f749d223c2a0e4b1d04a35852c0017e3c70fec475f3cf0439844b98380c43f
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function STALL() {
  return ml_host_std_time_duration_from_secs(30n);
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

export const translated = { ["STALL"]: STALL() };
export const provenance = {"sourcePath":"rust/tests/upstream_resilience_test.rs","sourceSha256":"c7f749d223c2a0e4b1d04a35852c0017e3c70fec475f3cf0439844b98380c43f","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":28,"runtimeParity":false};
