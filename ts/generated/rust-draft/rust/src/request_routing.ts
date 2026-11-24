type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from rust/src/request_routing.rs; sha256=983ec98db6d62721c2675f8c94256507c48985c504c063c9e9b80933ff6a7c42
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs, std_time_duration_as_secs as ml_host_duration_as_secs, std_time_duration_min as ml_host_std_time_duration_min } from "../../runtime/time-runtime.mjs";

function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 = {"schemaVersion":1,"types":{"rp_7374642e74696d652e4475726174696f6e":{"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e","ctors":[{"name":"Duration","fields":[{"name":"secs","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"nanos","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 = new Map([["rp_7374642e74696d652e4475726174696f6e", ml_validate_duration]]);

function ml_validate_duration(value: any) { ml_host_duration_as_secs(value); return true; }

function rp_726571756573745f726f7574696e672e4d41585f52455452595f4146544552(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((24n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_726571756573745f726f7574696e672e626f756e6465645f72657472795f6166746572(duration: Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  ml_validate_rust_value(duration, {"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e"}, ml_host_value_schema_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7, { refinements: ml_host_value_refinements_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 });
  return ml_host_std_time_duration_min(duration, rp_726571756573745f726f7574696e672e4d41585f52455452595f4146544552());
}

export const translated: { "MAX_RETRY_AFTER": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "bounded_retry_after": (duration: Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>) => Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> } = { ["MAX_RETRY_AFTER"]: rp_726571756573745f726f7574696e672e4d41585f52455452595f4146544552(), ["bounded_retry_after"]: rp_726571756573745f726f7574696e672e626f756e6465645f72657472795f6166746572 };
export const provenance = {"sourcePath":"rust/src/request_routing.rs","sourceSha256":"983ec98db6d62721c2675f8c94256507c48985c504c063c9e9b80933ff6a7c42","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":10,"runtimeParity":false};
