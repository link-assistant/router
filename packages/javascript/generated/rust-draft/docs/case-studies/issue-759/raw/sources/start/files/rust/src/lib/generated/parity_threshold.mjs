// Generated draft from docs/case-studies/issue-759/raw/sources/start/files/rust/src/lib/generated/parity_threshold.rs; sha256=0bf28248be7c8b5f9f09c58f166836f868fc5a865c74e0726265c1c799a756a5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../../../../../../../../../../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = new Map([]);

function minimum_rust_test_count(javascript_tests) {
  ml_validate_rust_value(javascript_tests, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return (javascript_tests * 0.9);
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

export const translated = { ["minimum_rust_test_count"]: minimum_rust_test_count };
export const provenance = {"sourcePath":"docs/case-studies/issue-759/raw/sources/start/files/rust/src/lib/generated/parity_threshold.rs","sourceSha256":"0bf28248be7c8b5f9f09c58f166836f868fc5a865c74e0726265c1c799a756a5","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":1,"preserved":3,"runtimeParity":false};
