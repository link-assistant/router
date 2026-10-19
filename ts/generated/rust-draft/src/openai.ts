type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
// Generated draft from src/openai.rs; sha256=9c7d6a2c5a25987042a54b98f96b2688a9d1ee2204cf670efa62e220ca15a87d
// Carried constructs are data, never runtime parity evidence.
import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function* ml_router_filter_map<T, U>(values: Iterable<T>, transform: (value: T) => Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>): IterableIterator<U> { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_collect<T>(values: Iterable<T>) { return Object.freeze(Array.from(values)); }

function ml_host_bool_then_some<T>(value: boolean, argument: T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_6f70656e61692e657874726163745f7373655f64617461(block: string): string {
  if (!(typeof block === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(block))) throw new TypeError('argument outside supported Rust value domain');
  return ml_str_join(ml_router_collect(ml_router_filter_map(ml_str_lines(block), (line) => { return ml_host_option_map((() => {
    const ml_text_25 = (() => {
      const ml_text_23 = line;
      const ml_text_24 = "\r";
      return (()=>{let text=ml_text_23;if(ml_text_24.length===0)return text;while(text.endsWith(ml_text_24))text=text.slice(0,text.length-ml_text_24.length);return text;})();
    })();
    const ml_text_26 = "data:";
    return (ml_text_25.startsWith(ml_text_26)?Object.freeze({ $: 'Some', field0: ml_text_25.slice(ml_text_26.length) }):Object.freeze({ $: 'None' }));
  })(), (ml_standard_callback_26_0) => { return (ml_standard_callback_26_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ''); }); })), "\n");
}

function rp_6f70656e61692e646f6e655f6672616d65(): string {
  return "data: [DONE]\n\n";
}

export const translated: { "extract_sse_data": (block: string) => string; "done_frame": () => string } = { ["extract_sse_data"]: rp_6f70656e61692e657874726163745f7373655f64617461, ["done_frame"]: rp_6f70656e61692e646f6e655f6672616d65 };
export const provenance = {"sourcePath":"src/openai.rs","sourceSha256":"9c7d6a2c5a25987042a54b98f96b2688a9d1ee2204cf670efa62e220ca15a87d","executable":2,"executableFunctions":2,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":25,"preserved":28,"runtimeParity":false};
