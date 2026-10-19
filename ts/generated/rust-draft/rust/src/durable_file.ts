type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from rust/src/durable_file.rs; sha256=edf2a314cf2797071a5c247124a9b4a3df1beb82665034bb77b3b611ae24e8e6
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../../runtime/time-runtime.mjs";

function rp_64757261626c655f66696c652e524f4c4c4241434b5f535546464958(): string {
  return ".router-rollback";
}

function rp_64757261626c655f66696c652e434f4d4d49545f535546464958(): string {
  return ".router-commit";
}

function rp_64757261626c655f66696c652e4c4f434b5f504f4c4c5f494e54455256414c(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_millis(20n);
}

export const translated: { "ROLLBACK_SUFFIX": string; "COMMIT_SUFFIX": string; "LOCK_POLL_INTERVAL": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> } = { ["ROLLBACK_SUFFIX"]: rp_64757261626c655f66696c652e524f4c4c4241434b5f535546464958(), ["COMMIT_SUFFIX"]: rp_64757261626c655f66696c652e434f4d4d49545f535546464958(), ["LOCK_POLL_INTERVAL"]: rp_64757261626c655f66696c652e4c4f434b5f504f4c4c5f494e54455256414c() };
export const provenance = {"sourcePath":"rust/src/durable_file.rs","sourceSha256":"edf2a314cf2797071a5c247124a9b4a3df1beb82665034bb77b3b611ae24e8e6","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":30,"runtimeParity":false};
