// Generated draft from src/deploy_local_host_tests.rs; sha256=442ae3579adeac3e653bb7168c7a2e5f25318a01293597c74e528d3cc086f84f
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function SECRET() {
  return "integration-test-signing-secret";
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

function EXECUTABLE() {
  return "/opt/router/bin/router";
}

function CANDIDATE_PORT() {
  return 49152n;
}

function ml_make_Process_Process(port, secret) {
  ml_fixed(port, 0n, 65535n, "u16 argument port out of range");
  if (!(typeof port === 'bigint' && port >= 0n && port <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof secret === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(secret))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Process", ["port"]: port, ["secret"]: secret });
}

export const translated = { ["SECRET"]: SECRET(), ["EXECUTABLE"]: EXECUTABLE(), ["CANDIDATE_PORT"]: CANDIDATE_PORT(), ["Process"]: ml_make_Process_Process };
export const provenance = {"sourcePath":"src/deploy_local_host_tests.rs","sourceSha256":"442ae3579adeac3e653bb7168c7a2e5f25318a01293597c74e528d3cc086f84f","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":1,"carried":34,"preserved":39,"runtimeParity":false};
