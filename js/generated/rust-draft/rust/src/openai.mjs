// Generated draft from rust/src/openai.rs; sha256=9c7d6a2c5a25987042a54b98f96b2688a9d1ee2204cf670efa62e220ca15a87d
// Carried constructs are data, never runtime parity evidence.
import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../../runtime/string-iterator-runtime.mjs";

function* ml_router_filter_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_6f70656e61692e657874726163745f7373655f64617461(block) {
  if (!(typeof block === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(block))) throw new TypeError('argument outside supported Rust value domain');
  return ml_str_join(ml_router_collect(ml_router_filter_map(ml_str_lines(block), (line) => { return ml_host_option_map((() => {
    const ml_text_7 = ((text, pattern) => { const chars=Array.from(text); let start=0, end=chars.length; while(end>start&&pattern.includes(chars[end-1]))end--;return chars.slice(start,end).join(''); })(line, Object.freeze(["\r"]));
    const ml_text_8 = "data:";
    return (ml_text_7.startsWith(ml_text_8)?Object.freeze({ $: 'Some', field0: ml_text_7.slice(ml_text_8.length) }):Object.freeze({ $: 'None' }));
  })(), (ml_standard_callback_8_0) => { return (ml_standard_callback_8_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ''); }); })), "\n");
}

function rp_6f70656e61692e646f6e655f6672616d65() {
  return "data: [DONE]\n\n";
}

export const translated = { ["extract_sse_data"]: rp_6f70656e61692e657874726163745f7373655f64617461, ["done_frame"]: rp_6f70656e61692e646f6e655f6672616d65 };
export const provenance = {"sourcePath":"rust/src/openai.rs","sourceSha256":"9c7d6a2c5a25987042a54b98f96b2688a9d1ee2204cf670efa62e220ca15a87d","executable":2,"executableFunctions":2,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":25,"preserved":28,"runtimeParity":false};
