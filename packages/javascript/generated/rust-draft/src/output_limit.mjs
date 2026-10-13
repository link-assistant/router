// Generated draft from src/output_limit.rs; sha256=b165be6e33444a5811b33e52567de74ca144e7208a24c161b231bd332cf899e0
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = new Map([]);

import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function* ml_router_filter_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e() {
  return 4n;
}

function ml_make_OutputTokenLimiter_OutputTokenLimiter(remaining, stopped) {
  ml_validate_rust_value(remaining, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  if (!(typeof stopped === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "OutputTokenLimiter", ["remaining"]: remaining, ["stopped"]: stopped });
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

function rp_6f75747075745f6c696d69742e646174615f7061796c6f6164(block) {
  if (!(typeof block === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(block))) throw new TypeError('argument outside supported Rust value domain');
  const payload = ml_str_join(ml_router_collect(ml_router_filter_map(ml_str_lines(block), (line) => { return ml_host_option_map((() => {
    const ml_text_79 = (() => {
      const ml_text_77 = line;
      const ml_text_78 = "\r";
      return (()=>{let text=ml_text_77;if(ml_text_78.length===0)return text;while(text.endsWith(ml_text_78))text=text.slice(0,text.length-ml_text_78.length);return text;})();
    })();
    const ml_text_80 = "data:";
    return (ml_text_79.startsWith(ml_text_80)?Object.freeze({ $: 'Some', field0: ml_text_79.slice(ml_text_80.length) }):Object.freeze({ $: 'None' }));
  })(), (ml_standard_callback_80_0) => { return (ml_standard_callback_80_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ''); }); })), "\n");
  return ml_host_bool_then_some(!(payload.length === 0), payload);
}

export const translated = { ["CHARS_PER_TOKEN"]: rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e(), ["OutputTokenLimiter"]: ml_make_OutputTokenLimiter_OutputTokenLimiter, ["data_payload"]: rp_6f75747075745f6c696d69742e646174615f7061796c6f6164 };
export const provenance = {"sourcePath":"src/output_limit.rs","sourceSha256":"b165be6e33444a5811b33e52567de74ca144e7208a24c161b231bd332cf899e0","executable":3,"executableFunctions":1,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":14,"runtimeParity":false};
