// Generated draft from tests/account_isolation_test.rs; sha256=e9035c81609b9afe81ea3c11882a1290a784067f73170ef448123f5dff2611e8
// Carried constructs are data, never runtime parity evidence.
import { stringLines as ml_str_lines, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  if (option) {
    if (value.$ === 'Some') return value.field0;
  } else if (value.$ === 'Ok') return value.field0;
  return fallback;
}

function ml_router_find_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") return result; } return Object.freeze({ $: "None" }); }

function ok_with_cookie(head) {
  if (!(typeof head === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(head))) throw new TypeError('argument outside supported Rust value domain');
  const account = (ml_router_unwrap(ml_router_find_map(ml_str_lines(head), (line) => { const ml_text_161 = line;
  const ml_text_162 = "x-account: ";
  return (ml_text_161.startsWith(ml_text_162)?Object.freeze({ $: 'Some', field0: ml_text_161.slice(ml_text_162.length) }):Object.freeze({ $: 'None' })); }), "unknown", true)).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
  return (() => {
    const ml_fmt_163 = account;
    return (("HTTP/1.1 200 OK\r\nset-cookie: session=" + ml_fmt_163) + "; Path=/\r\ncontent-length: 2\r\n\r\nok");
  })();
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

function proxied_answer(_head) {
  if (!(typeof _head === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(_head))) throw new TypeError('argument outside supported Rust value domain');
  return "HTTP/1.1 200 OK\r\ncontent-length: 7\r\n\r\nproxied";
}

function refuse_tunnel(_head) {
  if (!(typeof _head === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(_head))) throw new TypeError('argument outside supported Rust value domain');
  return "HTTP/1.1 403 Forbidden\r\ncontent-length: 0\r\n\r\n";
}

export const translated = { ["ok_with_cookie"]: ok_with_cookie, ["proxied_answer"]: proxied_answer, ["refuse_tunnel"]: refuse_tunnel };
export const provenance = {"sourcePath":"tests/account_isolation_test.rs","sourceSha256":"e9035c81609b9afe81ea3c11882a1290a784067f73170ef448123f5dff2611e8","executable":3,"executableFunctions":3,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":18,"preserved":22,"runtimeParity":false};
