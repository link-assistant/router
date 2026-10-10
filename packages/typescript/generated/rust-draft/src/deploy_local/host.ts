// Generated draft from src/deploy_local/host.rs; sha256=193445fd3ed840b57d89014579da778bb2594cc18f3a4f8ed546e6f8b5be36d6
// Carried constructs are data, never runtime parity evidence.
function ROLLBACK_COMMAND() {
  return "router deploy --mode container";
}

export const translated: { "ROLLBACK_COMMAND": string } = { "ROLLBACK_COMMAND": ROLLBACK_COMMAND() };
export const provenance = {"sourcePath":"src/deploy_local/host.rs","sourceSha256":"193445fd3ed840b57d89014579da778bb2594cc18f3a4f8ed546e6f8b5be36d6","executable":1,"executableFunctions":0,"executableConstants":1,"carried":15,"preserved":17,"runtimeParity":false};
