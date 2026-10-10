// Generated draft from src/deploy_local_secret_tests.rs; sha256=d93f1eab238d40f93f6feccfcaeb4ae7864a7e9bafa52ebedbc06efabca2863b
// Carried constructs are data, never runtime parity evidence.
function SECRET_A() {
  return "saved-signing-secret-a";
}

function SECRET_B() {
  return "mistaken-signing-secret-b";
}

export const translated = { "SECRET_A": SECRET_A(), "SECRET_B": SECRET_B() };
export const provenance = {"sourcePath":"src/deploy_local_secret_tests.rs","sourceSha256":"d93f1eab238d40f93f6feccfcaeb4ae7864a7e9bafa52ebedbc06efabca2863b","executable":2,"executableFunctions":0,"executableConstants":2,"carried":16,"preserved":19,"runtimeParity":false};
