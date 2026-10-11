// Generated draft from scripts/check-workflow-tools.rs; sha256=c5899e10a785b62dadbee63185b6509d425368d2c3ccb9d3b1356a0212a8db4a
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
};

const serde_json = {
  error: {

  },
};

function TOOLS() {
  return Object.freeze([(() => {
    const ml_record1 = "rust-script";
    const ml_record2 = Object.freeze(["rust-script "]);
    const ml_record3 = Object.freeze(["cargo install rust-script", "install-rust-script.sh"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record1, ["uses"]: ml_record2, ["installs"]: ml_record3 });
  })(), (() => {
    const ml_record4 = "cargo-cyclonedx";
    const ml_record5 = Object.freeze(["cargo cyclonedx"]);
    const ml_record6 = Object.freeze(["cargo install cargo-cyclonedx"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record4, ["uses"]: ml_record5, ["installs"]: ml_record6 });
  })(), (() => {
    const ml_record7 = "cargo-audit";
    const ml_record8 = Object.freeze(["cargo audit"]);
    const ml_record9 = Object.freeze(["cargo install cargo-audit"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record7, ["uses"]: ml_record8, ["installs"]: ml_record9 });
  })(), (() => {
    const ml_record10 = "cargo-llvm-cov";
    const ml_record11 = Object.freeze(["cargo llvm-cov"]);
    const ml_record12 = Object.freeze(["cargo install cargo-llvm-cov"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record10, ["uses"]: ml_record11, ["installs"]: ml_record12 });
  })(), (() => {
    const ml_record13 = "cargo-fuzz";
    const ml_record14 = Object.freeze(["cargo +nightly fuzz", "cargo fuzz"]);
    const ml_record15 = Object.freeze(["cargo install cargo-fuzz", "install cargo-fuzz"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record13, ["uses"]: ml_record14, ["installs"]: ml_record15 });
  })(), (() => {
    const ml_record16 = "cargo-mutants";
    const ml_record17 = Object.freeze(["cargo mutants"]);
    const ml_record18 = Object.freeze(["cargo install cargo-mutants"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record16, ["uses"]: ml_record17, ["installs"]: ml_record18 });
  })(), (() => {
    const ml_record19 = "sccache";
    const ml_record20 = Object.freeze(["RUSTC_WRAPPER=sccache", "RUSTC_WRAPPER: sccache"]);
    const ml_record21 = Object.freeze(["mozilla-actions/sccache-action@"]);
    return Object.freeze({ $: "Tool", ["name"]: ml_record19, ["uses"]: ml_record20, ["installs"]: ml_record21 });
  })()]);
}

export const translated = { ["Tool"]: ml_make_Tool_Tool, ["TOOLS"]: TOOLS() };
export const provenance = {"sourcePath":"scripts/check-workflow-tools.rs","sourceSha256":"c5899e10a785b62dadbee63185b6509d425368d2c3ccb9d3b1356a0212a8db4a","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":9,"preserved":11,"runtimeParity":false};
