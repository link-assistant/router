// Generated draft from tests/token_clock_test.rs; sha256=92cd75d2b1c8747759ec6d5a79302c37fb6bb686be0ef013651e0ee5b00e9ca7
// Carried constructs are data, never runtime parity evidence.
function ISSUED() {
  return 1600000000n;
}

function NOW() {
  return 1800000000n;
}

export const translated: { "ISSUED": bigint; "NOW": bigint } = { "ISSUED": ISSUED(), "NOW": NOW() };
export const provenance = {"sourcePath":"tests/token_clock_test.rs","sourceSha256":"92cd75d2b1c8747759ec6d5a79302c37fb6bb686be0ef013651e0ee5b00e9ca7","executable":2,"executableFunctions":0,"executableConstants":2,"carried":7,"preserved":10,"runtimeParity":false};
