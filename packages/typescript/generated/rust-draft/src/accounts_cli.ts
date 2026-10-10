// Generated draft from src/accounts_cli.rs; sha256=3119369d8c1b4b1ac57d7ce1eb75ecdc8229ede1148eb8a0024a544da4583681
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_PAUSE_REASON() {
  return "paused by an operator";
}

function resume_message(name: string, was_paused: boolean) {
  if (was_paused) {
    return ("resumed " + name);
  } else {
    return (name + " was not paused");
  }
}

export const translated: { "DEFAULT_PAUSE_REASON": string; "resume_message": (name: string, was_paused: boolean) => string } = { "DEFAULT_PAUSE_REASON": DEFAULT_PAUSE_REASON(), resume_message };
export const provenance = {"sourcePath":"src/accounts_cli.rs","sourceSha256":"3119369d8c1b4b1ac57d7ce1eb75ecdc8229ede1148eb8a0024a544da4583681","executable":2,"carried":13,"preserved":16,"runtimeParity":false};
