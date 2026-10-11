type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from src/vendor_cli_refresh.rs; sha256=f654f57e03a27282db948828b20e54d4d93d33517ce174b3a7a18255046e1cd9
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(90n);
}

function rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245(): ReadonlyArray<string> {
  return Object.freeze(["-p", "ok"]);
}

function rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245(): ReadonlyArray<string> {
  return Object.freeze(["exec", "--skip-git-repo-check", "ok"]);
}

function rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56(): string {
  return "ROUTER_VENDOR_REFRESH_ARGS";
}

export const translated: { "DEFAULT_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "CLAUDE_PROBE": ReadonlyArray<string>; "CODEX_PROBE": ReadonlyArray<string>; "PROBE_ARGS_ENV": string } = { ["DEFAULT_TIMEOUT"]: rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554(), ["CLAUDE_PROBE"]: rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245(), ["CODEX_PROBE"]: rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245(), ["PROBE_ARGS_ENV"]: rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56() };
export const provenance = {"sourcePath":"src/vendor_cli_refresh.rs","sourceSha256":"f654f57e03a27282db948828b20e54d4d93d33517ce174b3a7a18255046e1cd9","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":11,"preserved":16,"runtimeParity":false};
