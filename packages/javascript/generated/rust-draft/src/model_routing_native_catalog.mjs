// Generated draft from src/model_routing_native_catalog.rs; sha256=0c34dad3d0f588ea5344408e954045ffbb5fc484d04e7729859b51e06aeb0732
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_ANTHROPIC_PAGE() {
  return 1000n;
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

function DEFAULT_ANTHROPIC_PAGE() {
  return 20n;
}

function ml_make_AnthropicPage_AnthropicPage(start, end, has_more) {
  ml_fixed(start, 0n, 18446744073709551615n, "u64 argument start out of range");
  if (!(typeof start === 'bigint' && start >= 0n && start <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(end, 0n, 18446744073709551615n, "u64 argument end out of range");
  if (!(typeof end === 'bigint' && end >= 0n && end <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof has_more === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "AnthropicPage", ["start"]: start, ["end"]: end, ["has_more"]: has_more });
}

export const translated = { ["MAX_ANTHROPIC_PAGE"]: MAX_ANTHROPIC_PAGE(), ["DEFAULT_ANTHROPIC_PAGE"]: DEFAULT_ANTHROPIC_PAGE(), ["AnthropicPage"]: ml_make_AnthropicPage_AnthropicPage };
export const provenance = {"sourcePath":"src/model_routing_native_catalog.rs","sourceSha256":"0c34dad3d0f588ea5344408e954045ffbb5fc484d04e7729859b51e06aeb0732","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":19,"preserved":22,"runtimeParity":false};
