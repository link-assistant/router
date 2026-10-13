// Generated draft from src/github_proxy.rs; sha256=3c65440f41bef37e9f55641ae298a8083884a42cffa9797e6c8ab40e81ef4e37
// Carried constructs are data, never runtime parity evidence.
import { stringBytes as ml_string_bytes } from "../runtime/string-bytes-runtime.mjs";

import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../runtime/csv-string-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_router_all(values, predicate) { for (const value of values) if (!predicate(value)) return false; return true; }

function rp_6769746875625f70726f78792e504f4c4943595f484541444552() {
  return "x-link-assistant-policy";
}

function ml_make_PolicyDecision_Allow() {
  return Object.freeze({ $: 'Allow' });
}

function ml_make_PolicyDecision_Deny() {
  return Object.freeze({ $: 'Deny' });
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

function rp_6769746875625f70726f78792e636f6e7461696e735f696e6c696e655f7a65726f5f61667465725f6f6964(compact_query) {
  if (!(typeof compact_query === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(compact_query))) throw new TypeError('argument outside supported Rust value domain');
  let remainder = compact_query;
  while (true) {
    const ml_pattern_3 = (() => {
    const ml_text_1 = remainder;
    const ml_text_2 = "afteroid:\"";
    return (()=>{const index=ml_text_1.indexOf(ml_text_2);return index<0?Object.freeze({ $: 'None' }):Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: ml_text_1.slice(0,index), field1: ml_text_1.slice(index+ml_text_2.length) }) });})();
  })();
    if ((ml_pattern_immutable(ml_pattern_3) && (ml_pattern_3.$ === "Some"))) {
      const after = ((ml_pattern_3)["field0"])["field1"];
      const value = (() => {
    const ml_standard_body_1 = ml_csv_split_next(ml_csv_split(after, "\""));
    switch (ml_standard_body_1.$) {
      case "None": {
        return "";
      }
      case "Some": {
        const x = ml_standard_body_1.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })();
      if (((BigInt(new TextEncoder().encode(value).length) >= 40n) && ml_router_all(ml_string_bytes(value), (byte) => { return (byte === 48n); }))) {
        return true;
      } else {
      }
      remainder = after;
    } else {
      break;
    }
  }
  return false;
}

export const translated = { ["POLICY_HEADER"]: rp_6769746875625f70726f78792e504f4c4943595f484541444552(), ["PolicyDecision"]: Object.freeze({ ["Allow"]: ml_make_PolicyDecision_Allow, ["Deny"]: ml_make_PolicyDecision_Deny }), ["contains_inline_zero_after_oid"]: rp_6769746875625f70726f78792e636f6e7461696e735f696e6c696e655f7a65726f5f61667465725f6f6964 };
export const provenance = {"sourcePath":"src/github_proxy.rs","sourceSha256":"3c65440f41bef37e9f55641ae298a8083884a42cffa9797e6c8ab40e81ef4e37","executable":3,"executableFunctions":1,"executableConstants":1,"executableTypes":1,"executableConstructors":2,"carried":40,"preserved":44,"runtimeParity":false};
