// Generated draft from tests/storage_format_boundaries_test.rs; sha256=4ea32f224de2de32c36a72059229214df84eb0ed5c8e061a709f97b2c64f766b
// Carried constructs are data, never runtime parity evidence.
import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function records(log) {
  if (!(typeof log === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(log))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_collect(ml_router_filter(ml_str_lines(log), (line) => { return !((line).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '').length === 0); }));
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

export const translated = { ["records"]: records };
export const provenance = {"sourcePath":"tests/storage_format_boundaries_test.rs","sourceSha256":"4ea32f224de2de32c36a72059229214df84eb0ed5c8e061a709f97b2c64f766b","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":17,"runtimeParity":false};
