// Generated draft from src/managed_server/run_lease.rs; sha256=22be53e21c26db5f0fe794397db6f055e8b2a43a3da487529d56a13210af2a46
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function rp_6d616e616765645f7365727665722e72756e5f6c656173652e4845415254424541545f494e54455256414c() {
  return ml_host_std_time_duration_from_secs(30n);
}

function ml_make_Beat_Renewed() {
  return Object.freeze({ $: 'Renewed' });
}

function ml_make_Beat_Unsupported() {
  return Object.freeze({ $: 'Unsupported' });
}

function ml_make_Beat_Rejected() {
  return Object.freeze({ $: 'Rejected' });
}

function ml_make_Beat_Refused() {
  return Object.freeze({ $: 'Refused' });
}

function ml_make_Beat_Transient() {
  return Object.freeze({ $: 'Transient' });
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

export const translated = { ["HEARTBEAT_INTERVAL"]: rp_6d616e616765645f7365727665722e72756e5f6c656173652e4845415254424541545f494e54455256414c(), ["Beat"]: Object.freeze({ ["Renewed"]: ml_make_Beat_Renewed, ["Unsupported"]: ml_make_Beat_Unsupported, ["Rejected"]: ml_make_Beat_Rejected, ["Refused"]: ml_make_Beat_Refused, ["Transient"]: ml_make_Beat_Transient }) };
export const provenance = {"sourcePath":"src/managed_server/run_lease.rs","sourceSha256":"22be53e21c26db5f0fe794397db6f055e8b2a43a3da487529d56a13210af2a46","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":5,"carried":10,"preserved":13,"runtimeParity":false};
