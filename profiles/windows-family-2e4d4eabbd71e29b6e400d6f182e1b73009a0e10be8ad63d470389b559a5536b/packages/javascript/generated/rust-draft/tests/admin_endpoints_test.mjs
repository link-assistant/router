// Generated draft from tests/admin_endpoints_test.rs; sha256=b381e23399307cfb6a27db664c5b2977b2afb2ea4a21218c39eefdf9deacb8a5
// Carried constructs are data, never runtime parity evidence.
import { stringLines as ml_str_lines, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function ATTEMPTS() {
  return 5n;
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

function strip_chunking(body) {
  if (!(typeof body === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(body))) throw new TypeError('argument outside supported Rust value domain');
  if ((() => {
    const ml_text_1 = (body).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, '');
    const ml_text_2 = "{";
    return ml_text_1.startsWith(ml_text_2);
  })()) {
    return (body).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
  } else {
  }
  return ml_str_join(ml_router_collect(ml_router_filter(ml_str_lines(body), (line) => { const ml_text_7 = (line).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, '');
  const ml_text_8 = "{";
  return ml_text_7.startsWith(ml_text_8); })), "");
}

export const translated = { ["ATTEMPTS"]: ATTEMPTS(), ["strip_chunking"]: strip_chunking };
export const provenance = {"sourcePath":"tests/admin_endpoints_test.rs","sourceSha256":"b381e23399307cfb6a27db664c5b2977b2afb2ea4a21218c39eefdf9deacb8a5","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":24,"preserved":27,"runtimeParity":false};
