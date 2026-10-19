// Generated draft from src/thinking/parser.rs; sha256=7107cb1dab7a488d7abcb10fb8eb1de6888978d4faefdaaac0d573aed5e827c4
// Carried constructs are data, never runtime parity evidence.
import { createIntegerRuntime as ml_create_integer_runtime } from "../../runtime/integer-runtime.mjs";

import { stringBytes as ml_string_bytes } from "../../runtime/string-bytes-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_router_all(values, predicate) { for (const value of values) if (!predicate(value)) return false; return true; }

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

const ml_host_rust_integer_parse_u32 = ml_create_integer_runtime({"kind":"fixed","bits":32,"signed":false}).rust_integer_parse;

function rp_7468696e6b696e672e7061727365722e70617273655f6e756d657269635f737566666978(raw) {
  if (!(typeof raw === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(raw))) throw new TypeError('argument outside supported Rust value domain');
  if ((() => {
    const ml_standard_callback_self_3 = (() => {
      const ml_text_1 = raw;
      const ml_text_2 = "-";
      return (ml_text_1.startsWith(ml_text_2)?Object.freeze({ $: 'Some', field0: ml_text_1.slice(ml_text_2.length) }):Object.freeze({ $: 'None' }));
    })();
    switch (ml_standard_callback_self_3.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_4 = ml_standard_callback_self_3.field0;
        const ml_standard_callback_arg_1 = ml_standard_pattern_4;
        const digits = ml_standard_callback_arg_1;
        return (!(digits.length === 0) && ml_router_all(ml_string_bytes(digits), (digit) => { return (digit === 48n); }));
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_3);
      }
    }
  })()) {
    return Object.freeze({ $: 'Some', field0: 0n });
  } else {
    return ml_host_result_ok(ml_host_rust_integer_parse_u32(raw));
  }
}

export const translated = { ["parse_numeric_suffix"]: rp_7468696e6b696e672e7061727365722e70617273655f6e756d657269635f737566666978 };
export const provenance = {"sourcePath":"src/thinking/parser.rs","sourceSha256":"7107cb1dab7a488d7abcb10fb8eb1de6888978d4faefdaaac0d573aed5e827c4","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":6,"preserved":7,"runtimeParity":false};
