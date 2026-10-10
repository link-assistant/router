// Generated draft from src/accounts_cli.rs; sha256=3119369d8c1b4b1ac57d7ce1eb75ecdc8229ede1148eb8a0024a544da4583681
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_PAUSE_REASON() {
  return "paused by an operator";
}

function LOCAL_NOTE() {
  return "note: recorded in this machine's data directory; a router started from it applies the change at startup. Pass --server <URL> to change a running router.";
}

function resume_message(name, was_paused) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof was_paused === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (was_paused) {
    return ("resumed " + name);
  } else {
    return (name + " was not paused");
  }
}

export const translated = { "DEFAULT_PAUSE_REASON": DEFAULT_PAUSE_REASON(), "LOCAL_NOTE": LOCAL_NOTE(), resume_message };
export const provenance = {"sourcePath":"src/accounts_cli.rs","sourceSha256":"3119369d8c1b4b1ac57d7ce1eb75ecdc8229ede1148eb8a0024a544da4583681","executable":3,"executableFunctions":1,"executableConstants":2,"carried":12,"preserved":16,"runtimeParity":false};
