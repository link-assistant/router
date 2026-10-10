// Generated draft from tests/deploy_docker_secret_test.rs; sha256=b6e50c17b10d7aa4850626a68ebee897c95cc857999bc1fff66a2feb98866d18
// Carried constructs are data, never runtime parity evidence.
function SECRET_A() {
  return "deploy-docker-test-secret";
}

function SECRET_B() {
  return "deploy-docker-mistaken-secret";
}

export const translated = { "SECRET_A": SECRET_A(), "SECRET_B": SECRET_B() };
export const provenance = {"sourcePath":"tests/deploy_docker_secret_test.rs","sourceSha256":"b6e50c17b10d7aa4850626a68ebee897c95cc857999bc1fff66a2feb98866d18","executable":2,"carried":13,"preserved":16,"runtimeParity":false};
