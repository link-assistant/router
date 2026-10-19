// Generated draft from src/native_service_resources.rs; sha256=335509c73af26192c00cb49f8cadd6e31be523f2b223482c8ee2378130aa94d0
// Carried constructs are data, never runtime parity evidence.
import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../runtime/csv-string-runtime.mjs";

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function split_tail(tail) {
  if (!(typeof tail === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(tail))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_collect(ml_router_filter(ml_csv_split((() => {
    const ml_text_23 = tail;
    const ml_text_24 = "/";
    return (()=>{let text=ml_text_23;if(ml_text_24.length===0)return text;while(text.startsWith(ml_text_24))text=text.slice(ml_text_24.length);while(text.endsWith(ml_text_24))text=text.slice(0,text.length-ml_text_24.length);return text;})();
  })(), "/"), (segment) => { return !(segment.length === 0); }));
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

export const translated = { ["split_tail"]: split_tail };
export const provenance = {"sourcePath":"src/native_service_resources.rs","sourceSha256":"335509c73af26192c00cb49f8cadd6e31be523f2b223482c8ee2378130aa94d0","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":22,"preserved":23,"runtimeParity":false};
