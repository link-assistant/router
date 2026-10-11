// Generated draft from src/openai_stream.rs; sha256=a39b0fd84669bcda0c3ebdc9c22be0d65a5ae734352f4e53d9e8da40730a7171
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_OpenAIStreamShape_ChatCompletion() {
  return Object.freeze({ $: 'ChatCompletion' });
}

function ml_make_OpenAIStreamShape_Response() {
  return Object.freeze({ $: 'Response' });
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

function ml_make_ResponseToolCall_ResponseToolCall(call_id, name, arguments_, output_index) {
  if (!(typeof call_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(call_id))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof arguments_ === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(arguments_))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(output_index, 0n, 18446744073709551615n, "u64 argument output_index out of range");
  if (!(typeof output_index === 'bigint' && output_index >= 0n && output_index <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ResponseToolCall", ["call_id"]: call_id, ["name"]: name, ["arguments"]: arguments_, ["output_index"]: output_index });
}

export const translated = { ["OpenAIStreamShape"]: Object.freeze({ ["ChatCompletion"]: ml_make_OpenAIStreamShape_ChatCompletion, ["Response"]: ml_make_OpenAIStreamShape_Response }), ["ResponseToolCall"]: ml_make_ResponseToolCall_ResponseToolCall };
export const provenance = {"sourcePath":"src/openai_stream.rs","sourceSha256":"a39b0fd84669bcda0c3ebdc9c22be0d65a5ae734352f4e53d9e8da40730a7171","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":3,"carried":6,"preserved":9,"runtimeParity":false};
