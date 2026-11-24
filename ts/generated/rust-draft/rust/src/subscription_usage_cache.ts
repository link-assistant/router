type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from rust/src/subscription_usage_cache.rs; sha256=3494015a3449bc43c2c1ffb08e1d97c4250c55f8501db0f38ed82db9d7c2d4bf
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_737562736372697074696f6e5f75736167652e63616368652e5354414e444152445f43414348455f54544c(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(ml_fixed((3n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_737562736372697074696f6e5f75736167652e63616368652e414e5448524f5049435f43414348455f54544c(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(ml_fixed((13n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

export const translated: { "STANDARD_CACHE_TTL": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "ANTHROPIC_CACHE_TTL": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> } = { ["STANDARD_CACHE_TTL"]: rp_737562736372697074696f6e5f75736167652e63616368652e5354414e444152445f43414348455f54544c(), ["ANTHROPIC_CACHE_TTL"]: rp_737562736372697074696f6e5f75736167652e63616368652e414e5448524f5049435f43414348455f54544c() };
export const provenance = {"sourcePath":"rust/src/subscription_usage_cache.rs","sourceSha256":"3494015a3449bc43c2c1ffb08e1d97c4250c55f8501db0f38ed82db9d7c2d4bf","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":20,"preserved":23,"runtimeParity":false};
