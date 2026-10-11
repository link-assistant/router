// Generated draft from tests/upstream_error_dialect_test.rs; sha256=cfb700da8d4d221bd8b698ee5424bd411d587757921ad692fce2cfdcc0f319c7
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function UPSTREAM_RATE_LIMIT() {
  return "{\"error\":{\"type\":\"usage_limit_reached\",\"message\":\"Synthetic limit reached\",\"plan_type\":\"example\",\"resets_at\":1893456000,\"eligible_promo\":null,\"resets_in_seconds\":3600}}";
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

const serde_json = {
  error: {

  },
};

function OPERATOR_FIELDS() {
  return ml_copy_fixed_array(["plan_type", "eligible_promo", "resets_at", "usage_limit_reached"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":4}});
}

export const translated = { ["UPSTREAM_RATE_LIMIT"]: UPSTREAM_RATE_LIMIT(), ["OPERATOR_FIELDS"]: OPERATOR_FIELDS() };
export const provenance = {"sourcePath":"tests/upstream_error_dialect_test.rs","sourceSha256":"cfb700da8d4d221bd8b698ee5424bd411d587757921ad692fce2cfdcc0f319c7","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":29,"runtimeParity":false};
