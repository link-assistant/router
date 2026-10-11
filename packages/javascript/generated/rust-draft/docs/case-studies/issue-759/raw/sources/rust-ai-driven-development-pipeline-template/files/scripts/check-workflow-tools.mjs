// Generated draft from docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-workflow-tools.rs; sha256=c80413b95e36b3cd9d2c47f251e9cfb6894fd421fb836bbc384141da7afaa8e6
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_Tool_Tool(name, uses, installs) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(uses, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(installs, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Tool", ["name"]: name, ["uses"]: uses, ["installs"]: installs });
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

function TOOLS() {
  return Object.freeze([(() => {
    const ml_record1 = "rust-script";
    const ml_record2 = Object.freeze(["rust-script ", "scripts/test-scripts.sh"]);
    const ml_record3 = Object.freeze(["cargo install rust-script", "install-rust-script.sh"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record1, ["uses"]: ml_record2, ["installs"]: ml_record3 });
  })(), (() => {
    const ml_record4 = "cargo-cyclonedx";
    const ml_record5 = Object.freeze(["cargo cyclonedx", "cargo-cyclonedx "]);
    const ml_record6 = Object.freeze(["cargo install cargo-cyclonedx"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record4, ["uses"]: ml_record5, ["installs"]: ml_record6 });
  })(), (() => {
    const ml_record7 = "cargo-audit";
    const ml_record8 = Object.freeze(["cargo audit", "cargo-audit "]);
    const ml_record9 = Object.freeze(["cargo install cargo-audit"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record7, ["uses"]: ml_record8, ["installs"]: ml_record9 });
  })(), (() => {
    const ml_record10 = "cargo-llvm-cov";
    const ml_record11 = Object.freeze(["cargo llvm-cov", "cargo-llvm-cov "]);
    const ml_record12 = Object.freeze(["cargo install cargo-llvm-cov"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record10, ["uses"]: ml_record11, ["installs"]: ml_record12 });
  })(), (() => {
    const ml_record13 = "sccache";
    const ml_record14 = Object.freeze(["RUSTC_WRAPPER=sccache", "RUSTC_WRAPPER: sccache", "sccache "]);
    const ml_record15 = Object.freeze(["mozilla-actions/sccache-action@", "cargo install sccache"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record13, ["uses"]: ml_record14, ["installs"]: ml_record15 });
  })()]);
}

export const translated = { ["Tool"]: ml_make_Tool_Tool, ["TOOLS"]: TOOLS() };
export const provenance = {"sourcePath":"docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-workflow-tools.rs","sourceSha256":"c80413b95e36b3cd9d2c47f251e9cfb6894fd421fb836bbc384141da7afaa8e6","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":12,"runtimeParity":false};
