// Generated draft from src/storage.rs; sha256=d301981bd64c7b8726fbe89e13c7d580a66e7219ca5137c70aee0930f30e3050
// Carried constructs are data, never runtime parity evidence.
import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function* ml_router_map(values, transform) { for (const value of values) yield transform(value); }

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_fold(values, initial, combine) { let result = initial; for (const value of values) result = combine(result, value); return result; }

function ml_make_RequestAdmission_Admitted() {
  return Object.freeze({ $: 'Admitted' });
}

function ml_make_RequestAdmission_RequestLimitExceeded() {
  return Object.freeze({ $: 'RequestLimitExceeded' });
}

function ml_make_RequestAdmission_TokenLimitExceeded() {
  return Object.freeze({ $: 'TokenLimitExceeded' });
}

function ml_make_RequestAdmission_RateLimitExceeded() {
  return Object.freeze({ $: 'RateLimitExceeded' });
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

function rp_73746f726167652e73616e6974697a655f636f6465635f6572726f72(error, contents) {
  if (!(typeof error === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(error))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof contents === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(contents))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_fold(ml_router_filter(ml_router_map(ml_str_lines(contents), (ml_standard_callback_8_0) => { return (ml_standard_callback_8_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, ''); }), (line) => { return (BigInt(new TextEncoder().encode(line).length) >= 8n); }), error, (message, line_2) => { const ml_text_10 = message;
  const ml_text_11 = line_2;
  const ml_text_12 = "<redacted input>";
  return (ml_text_11.length===0?(ml_text_10.length===0?ml_text_12:ml_text_12+Array.from(ml_text_10).join(ml_text_12)+ml_text_12):ml_text_10.split(ml_text_11).join(ml_text_12)); });
}

export const translated = { ["RequestAdmission"]: Object.freeze({ ["Admitted"]: ml_make_RequestAdmission_Admitted, ["RequestLimitExceeded"]: ml_make_RequestAdmission_RequestLimitExceeded, ["TokenLimitExceeded"]: ml_make_RequestAdmission_TokenLimitExceeded, ["RateLimitExceeded"]: ml_make_RequestAdmission_RateLimitExceeded }), ["sanitize_codec_error"]: rp_73746f726167652e73616e6974697a655f636f6465635f6572726f72 };
export const provenance = {"sourcePath":"src/storage.rs","sourceSha256":"d301981bd64c7b8726fbe89e13c7d580a66e7219ca5137c70aee0930f30e3050","executable":2,"executableFunctions":1,"executableConstants":0,"executableTypes":1,"executableConstructors":4,"carried":42,"preserved":45,"runtimeParity":false};
