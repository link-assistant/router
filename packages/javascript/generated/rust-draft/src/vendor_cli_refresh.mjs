// Generated draft from src/vendor_cli_refresh.rs; sha256=f654f57e03a27282db948828b20e54d4d93d33517ce174b3a7a18255046e1cd9
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(90n);
}

function CLAUDE_PROBE() {
  return Object.freeze(["-p", "ok"]);
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

function CODEX_PROBE() {
  return Object.freeze(["exec", "--skip-git-repo-check", "ok"]);
}

function PROBE_ARGS_ENV() {
  return "ROUTER_VENDOR_REFRESH_ARGS";
}

export const translated = { ["DEFAULT_TIMEOUT"]: rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554(), ["CLAUDE_PROBE"]: CLAUDE_PROBE(), ["CODEX_PROBE"]: CODEX_PROBE(), ["PROBE_ARGS_ENV"]: PROBE_ARGS_ENV() };
export const provenance = {"sourcePath":"src/vendor_cli_refresh.rs","sourceSha256":"f654f57e03a27282db948828b20e54d4d93d33517ce174b3a7a18255046e1cd9","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":11,"preserved":16,"runtimeParity":false};
