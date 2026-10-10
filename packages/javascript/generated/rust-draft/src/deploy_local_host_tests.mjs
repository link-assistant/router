// Generated draft from src/deploy_local_host_tests.rs; sha256=442ae3579adeac3e653bb7168c7a2e5f25318a01293597c74e528d3cc086f84f
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "integration-test-signing-secret";
}

function EXECUTABLE() {
  return "/opt/router/bin/router";
}

function CANDIDATE_PORT() {
  return 49152n;
}

export const translated = { "SECRET": SECRET(), "EXECUTABLE": EXECUTABLE(), "CANDIDATE_PORT": CANDIDATE_PORT() };
export const provenance = {"sourcePath":"src/deploy_local_host_tests.rs","sourceSha256":"442ae3579adeac3e653bb7168c7a2e5f25318a01293597c74e528d3cc086f84f","executable":3,"executableFunctions":0,"executableConstants":3,"carried":35,"preserved":39,"runtimeParity":false};
