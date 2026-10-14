// Generated draft from src/config.rs; sha256=9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../runtime/csv-string-runtime.mjs";

function* ml_router_map(values, transform) { for (const value of values) yield transform(value); }

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function rp_636f6e6669672e44454641554c545f4d41585f50524f58595f524551554553545f4259544553() {
  return ml_fixed((ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_ApiFormat_Anthropic() {
  return Object.freeze({ $: 'Anthropic' });
}

function ml_make_ApiFormat_Bedrock() {
  return Object.freeze({ $: 'Bedrock' });
}

function ml_make_ApiFormat_Vertex() {
  return Object.freeze({ $: 'Vertex' });
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

function rp_636f6e6669672e64656661756c745f6d70705f636f6e666967() {
  const ml_record1 = false;
  const ml_record2 = "0.00";
  const ml_record3 = "USD";
  const ml_record4 = "";
  const ml_record5 = Object.freeze({ $: 'None' });
  return Object.freeze({ $: "MppConfig", ["enabled"]: ml_record1, ["amount"]: ml_record2, ["currency"]: ml_record3, ["recipient"]: ml_record4, ["method"]: ml_record5 });
}

function rp_636f6e6669672e64656661756c745f61637469766974797075625f7075626c69635f6b65795f70656d() {
  return "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA0000000000000000000000000000000000000000000=\n-----END PUBLIC KEY-----";
}

function rp_636f6e6669672e70617273655f637376(raw) {
  if (!(typeof raw === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(raw))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_collect(ml_router_map(ml_router_filter(ml_router_map(ml_csv_split(raw, ","), (ml_standard_callback_37_0) => { return (ml_standard_callback_37_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, ''); }), (s) => { return !(s.length === 0); }), (ml_standard_callback_38_0) => { return ml_csv_allocate(ml_standard_callback_38_0); }));
}

export const translated = { ["DEFAULT_MAX_PROXY_REQUEST_BYTES"]: rp_636f6e6669672e44454641554c545f4d41585f50524f58595f524551554553545f4259544553(), ["ApiFormat"]: Object.freeze({ ["Anthropic"]: ml_make_ApiFormat_Anthropic, ["Bedrock"]: ml_make_ApiFormat_Bedrock, ["Vertex"]: ml_make_ApiFormat_Vertex }), ["default_mpp_config"]: rp_636f6e6669672e64656661756c745f6d70705f636f6e666967, ["default_activitypub_public_key_pem"]: rp_636f6e6669672e64656661756c745f61637469766974797075625f7075626c69635f6b65795f70656d, ["parse_csv"]: rp_636f6e6669672e70617273655f637376 };
export const provenance = {"sourcePath":"src/config.rs","sourceSha256":"9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a","executable":5,"executableFunctions":3,"executableConstants":1,"executableTypes":1,"executableConstructors":3,"carried":28,"preserved":34,"runtimeParity":false};
