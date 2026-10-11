// Generated draft from scripts/check-coverage.rs; sha256=6688180722a4f0f071b69881cf6412f88d4d582377a54d656d651b0200a8059b
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

const ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = new Map([]);

function ml_make_Decision_Decision(measured, committed, previous, enforced_floor, next_baseline, errors) {
  ml_validate_rust_value(measured, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(committed, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(previous, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(enforced_floor, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(next_baseline, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  if (!ml_router_array(errors, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Decision", ["measured"]: measured, ["committed"]: committed, ["previous"]: previous, ["enforced_floor"]: enforced_floor, ["next_baseline"]: next_baseline, ["errors"]: errors });
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

export const translated = { ["Decision"]: ml_make_Decision_Decision };
export const provenance = {"sourcePath":"scripts/check-coverage.rs","sourceSha256":"6688180722a4f0f071b69881cf6412f88d4d582377a54d656d651b0200a8059b","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":23,"preserved":24,"runtimeParity":false};
