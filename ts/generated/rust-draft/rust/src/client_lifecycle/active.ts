type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from rust/src/client_lifecycle/active.rs; sha256=6429b7a699dc500b96f0b9b84fbf9364db604158d7ee4e41cdd133a03e9fbf07
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../../../runtime/time-runtime.mjs";

function rp_636c69656e745f6c6966656379636c652e6163746976652e50524f46494c455f5641524941424c4553(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["HOME", "USERPROFILE", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "APPDATA", "LOCALAPPDATA", "CODEX_HOME", "CLAUDE_CONFIG_DIR", "CURSOR_CONFIG_DIR", "GEMINI_CLI_HOME", "OPENCODE_CONFIG_DIR", "QWEN_HOME", "QWEN_RUNTIME_DIR"]));
}

function rp_636c69656e745f6c6966656379636c652e6163746976652e534554544c455f415454454d505453(): bigint {
  return 5n;
}

function rp_636c69656e745f6c6966656379636c652e6163746976652e534554544c455f44454c4159(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_millis(20n);
}

export const translated: { "PROFILE_VARIABLES": ReadonlyArray<string>; "SETTLE_ATTEMPTS": bigint; "SETTLE_DELAY": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> } = { ["PROFILE_VARIABLES"]: rp_636c69656e745f6c6966656379636c652e6163746976652e50524f46494c455f5641524941424c4553(), ["SETTLE_ATTEMPTS"]: rp_636c69656e745f6c6966656379636c652e6163746976652e534554544c455f415454454d505453(), ["SETTLE_DELAY"]: rp_636c69656e745f6c6966656379636c652e6163746976652e534554544c455f44454c4159() };
export const provenance = {"sourcePath":"rust/src/client_lifecycle/active.rs","sourceSha256":"6429b7a699dc500b96f0b9b84fbf9364db604158d7ee4e41cdd133a03e9fbf07","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":23,"preserved":27,"runtimeParity":false};
