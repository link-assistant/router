// Generated draft from src/deploy_local/host_plan_tests.rs; sha256=095b4986dd4d640f523ddd79335db3cefb483714c60653d9544315c05c78a381
// Carried constructs are data, never runtime parity evidence.
function EXECUTABLE() {
  return "/opt/router/bin/router";
}

function RUNS() {
  return "[\n  {\"id\":\"exited\",\"label\":\"with-claude-0911\",\"issued_at\":1,\"expires_at\":4102444800,\n   \"revoked\":false,\"ephemeral\":true,\"run_lease_expires_at\":1000},\n  {\"id\":\"running\",\"label\":\"with-claude-1776\",\"issued_at\":1,\"expires_at\":4102444800,\n   \"revoked\":false,\"ephemeral\":true,\"run_lease_expires_at\":4102444000},\n  {\"id\":\"pre-lease\",\"label\":\"scheduled\",\"issued_at\":1,\"expires_at\":4102444800,\n   \"revoked\":false,\"ephemeral\":true}\n]";
}

export const translated = { "EXECUTABLE": EXECUTABLE(), "RUNS": RUNS() };
export const provenance = {"sourcePath":"src/deploy_local/host_plan_tests.rs","sourceSha256":"095b4986dd4d640f523ddd79335db3cefb483714c60653d9544315c05c78a381","executable":2,"executableFunctions":0,"executableConstants":2,"carried":6,"preserved":9,"runtimeParity":false};
