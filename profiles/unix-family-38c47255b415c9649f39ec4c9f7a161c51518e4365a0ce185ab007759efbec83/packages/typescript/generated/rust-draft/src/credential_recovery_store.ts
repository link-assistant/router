type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from src/credential_recovery_store.rs; sha256=91af0053ff35f899efd181962f0492665e10bfab06b59e2c30b261dfabbc8f5e
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f56455253494f4e(): bigint {
  return 1n;
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f4449524543544f5259(): string {
  return "refresh-recovery";
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5052494d4152595f4143434f554e54(): string {
  return "primary";
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e43524544454e5449414c5f4c4f434b5f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(5n);
}

export const translated: { "RECOVERY_VERSION": bigint; "RECOVERY_DIRECTORY": string; "PRIMARY_ACCOUNT": string; "CREDENTIAL_LOCK_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> } = { ["RECOVERY_VERSION"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f56455253494f4e(), ["RECOVERY_DIRECTORY"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f4449524543544f5259(), ["PRIMARY_ACCOUNT"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5052494d4152595f4143434f554e54(), ["CREDENTIAL_LOCK_TIMEOUT"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e43524544454e5449414c5f4c4f434b5f54494d454f5554() };
export const provenance = {"sourcePath":"src/credential_recovery_store.rs","sourceSha256":"91af0053ff35f899efd181962f0492665e10bfab06b59e2c30b261dfabbc8f5e","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":18,"runtimeParity":false};
