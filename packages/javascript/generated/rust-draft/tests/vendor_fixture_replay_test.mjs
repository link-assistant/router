// Generated draft from tests/vendor_fixture_replay_test.rs; sha256=8c728de44cb826a3b8b4f52e15a091bdc239e89fc32bb91234b300283eb3b425
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function CLAUDE_MODEL() {
  return "claude-sonnet-4-5-20250929";
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
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function PROMPT() {
  return "What's the weather in Paris?";
}

function ml_make_Outcome_Outcome(status, body, used, reserved) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof body === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(body))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(used, 0n, 18446744073709551615n, "u64 argument used out of range");
  if (!(typeof used === 'bigint' && used >= 0n && used <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(reserved, 0n, 18446744073709551615n, "u64 argument reserved out of range");
  if (!(typeof reserved === 'bigint' && reserved >= 0n && reserved <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Outcome", ["status"]: status, ["body"]: body, ["used"]: used, ["reserved"]: reserved });
}

export const translated = { ["CLAUDE_MODEL"]: CLAUDE_MODEL(), ["PROMPT"]: PROMPT(), ["Outcome"]: ml_make_Outcome_Outcome };
export const provenance = {"sourcePath":"tests/vendor_fixture_replay_test.rs","sourceSha256":"8c728de44cb826a3b8b4f52e15a091bdc239e89fc32bb91234b300283eb3b425","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":16,"preserved":20,"runtimeParity":false};
