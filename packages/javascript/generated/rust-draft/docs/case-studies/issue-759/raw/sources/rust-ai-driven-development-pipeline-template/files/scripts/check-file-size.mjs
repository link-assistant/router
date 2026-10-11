// Generated draft from docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-file-size.rs; sha256=9f1a5475031bc1772f95620356ac3233ed488cadc07fecf5ae1778a95d8eaa76
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../../../../../../../../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_c2e4a4c2cf2f57b0674c5b31c35eec46bab8dc91ed7ab5045ba970c441f90617 = {"schemaVersion":1,"types":{"Finding":{"kind":"data","name":"Finding","ctors":[{"name":"Finding","fields":[{"name":"file","type":{"kind":"string"}},{"name":"lines","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_c2e4a4c2cf2f57b0674c5b31c35eec46bab8dc91ed7ab5045ba970c441f90617 = new Map([]);

function MAX_LINES() {
  return 1000n;
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

function WARN_LINES() {
  return 900n;
}

function MAX_DOC_LINES() {
  return 2500n;
}

function WARN_DOC_LINES() {
  return 2250n;
}

function FILE_EXTENSIONS() {
  return Object.freeze([".rs", ".md"]);
}

function EXCLUDE_PATTERNS() {
  return Object.freeze(["target", ".git", "node_modules"]);
}

function ml_make_Finding_Finding(file, lines) {
  if (!(typeof file === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(lines, 0n, 18446744073709551615n, "u64 argument lines out of range");
  if (!(typeof lines === 'bigint' && lines >= 0n && lines <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Finding", ["file"]: file, ["lines"]: lines });
}

function ml_make_CheckResult_CheckResult(warnings, violations) {
  ml_validate_rust_value(warnings, {"kind":"array","element":{"kind":"data","name":"Finding"}}, ml_host_value_schema_c2e4a4c2cf2f57b0674c5b31c35eec46bab8dc91ed7ab5045ba970c441f90617, { refinements: ml_host_value_refinements_c2e4a4c2cf2f57b0674c5b31c35eec46bab8dc91ed7ab5045ba970c441f90617 });
  ml_validate_rust_value(violations, {"kind":"array","element":{"kind":"data","name":"Finding"}}, ml_host_value_schema_c2e4a4c2cf2f57b0674c5b31c35eec46bab8dc91ed7ab5045ba970c441f90617, { refinements: ml_host_value_refinements_c2e4a4c2cf2f57b0674c5b31c35eec46bab8dc91ed7ab5045ba970c441f90617 });
  return Object.freeze({ $: "CheckResult", ["warnings"]: warnings, ["violations"]: violations });
}

function ml_make_LineStatus_WithinLimit() {
  return Object.freeze({ $: 'WithinLimit' });
}

function ml_make_LineStatus_Warning() {
  return Object.freeze({ $: 'Warning' });
}

function ml_make_LineStatus_Violation() {
  return Object.freeze({ $: 'Violation' });
}

function classify_line_count(line_count, warn, max) {
  ml_fixed(line_count, 0n, 18446744073709551615n, "u64 argument line_count out of range");
  if (!(typeof line_count === 'bigint' && line_count >= 0n && line_count <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(warn, 0n, 18446744073709551615n, "u64 argument warn out of range");
  if (!(typeof warn === 'bigint' && warn >= 0n && warn <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(max, 0n, 18446744073709551615n, "u64 argument max out of range");
  if (!(typeof max === 'bigint' && max >= 0n && max <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if ((line_count > max)) {
    return Object.freeze({ $: 'Violation' });
  } else {
    if ((line_count > warn)) {
      return Object.freeze({ $: 'Warning' });
    } else {
      return Object.freeze({ $: 'WithinLimit' });
    }
  }
}

export const translated = { ["MAX_LINES"]: MAX_LINES(), ["WARN_LINES"]: WARN_LINES(), ["MAX_DOC_LINES"]: MAX_DOC_LINES(), ["WARN_DOC_LINES"]: WARN_DOC_LINES(), ["FILE_EXTENSIONS"]: FILE_EXTENSIONS(), ["EXCLUDE_PATTERNS"]: EXCLUDE_PATTERNS(), ["Finding"]: ml_make_Finding_Finding, ["CheckResult"]: ml_make_CheckResult_CheckResult, ["LineStatus"]: Object.freeze({ ["WithinLimit"]: ml_make_LineStatus_WithinLimit, ["Warning"]: ml_make_LineStatus_Warning, ["Violation"]: ml_make_LineStatus_Violation }), ["classify_line_count"]: classify_line_count };
export const provenance = {"sourcePath":"docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-file-size.rs","sourceSha256":"9f1a5475031bc1772f95620356ac3233ed488cadc07fecf5ae1778a95d8eaa76","executable":10,"executableFunctions":1,"executableConstants":6,"executableTypes":3,"executableConstructors":5,"carried":21,"preserved":31,"runtimeParity":false};
