// Generated draft from src/storage/associative.rs; sha256=ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1
// Carried constructs are data, never runtime parity evidence.
import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../../runtime/csv-string-runtime.mjs";

function* ml_router_map(values, transform) { for (const value of values) yield transform(value); }

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function rp_73746f726167652e6173736f636961746976652e54595045() {
  return "Type";
}

function rp_73746f726167652e6173736f636961746976652e544f4b454e5f5245434f5244() {
  return "TokenRecord";
}

function rp_73746f726167652e6173736f636961746976652e53554254595045() {
  return "SubType";
}

function rp_73746f726167652e6173736f636961746976652e56414c5545() {
  return "Value";
}

function rp_73746f726167652e6173736f636961746976652e53544f524147455f464f524d4154() {
  return "StorageFormat";
}

function rp_73746f726167652e6173736f636961746976652e464f524d41545f56455253494f4e() {
  return "router-token-doublets-v1";
}

function rp_73746f726167652e6173736f636961746976652e5245434f52445f505245464958() {
  return "Record/";
}

function rp_73746f726167652e6173736f636961746976652e535452494e475f544147() {
  return 1n;
}

function rp_73746f726167652e6173736f636961746976652e454447455f544147() {
  return 2n;
}

function rp_73746f726167652e6173736f636961746976652e454d5054595f53455155454e4345() {
  return 3n;
}

function rp_73746f726167652e6173736f636961746976652e425954455f4e4f44455f5354415254() {
  return 4n;
}

function rp_73746f726167652e6173736f636961746976652e534348454d415f4e4f44455f434f554e54() {
  return 259n;
}

function ml_make_SemanticLink_SemanticLink(source, target) {
  if (!(typeof source === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(source))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof target === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(target))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "SemanticLink", ["source"]: source, ["target"]: target });
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

function rp_73746f726167652e6173736f636961746976652e73706c69745f7265706f7369746f72795f6c697374(joined) {
  if (!(typeof joined === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(joined))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_collect(ml_router_map(ml_router_filter(ml_router_map(ml_csv_split(joined, ","), (ml_standard_callback_37_0) => { return (ml_standard_callback_37_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, ''); }), (entry) => { return !(entry.length === 0); }), (ml_standard_callback_38_0) => { return ml_csv_allocate(ml_standard_callback_38_0); }));
}

export const translated = { ["TYPE"]: rp_73746f726167652e6173736f636961746976652e54595045(), ["TOKEN_RECORD"]: rp_73746f726167652e6173736f636961746976652e544f4b454e5f5245434f5244(), ["SUBTYPE"]: rp_73746f726167652e6173736f636961746976652e53554254595045(), ["VALUE"]: rp_73746f726167652e6173736f636961746976652e56414c5545(), ["STORAGE_FORMAT"]: rp_73746f726167652e6173736f636961746976652e53544f524147455f464f524d4154(), ["FORMAT_VERSION"]: rp_73746f726167652e6173736f636961746976652e464f524d41545f56455253494f4e(), ["RECORD_PREFIX"]: rp_73746f726167652e6173736f636961746976652e5245434f52445f505245464958(), ["STRING_TAG"]: rp_73746f726167652e6173736f636961746976652e535452494e475f544147(), ["EDGE_TAG"]: rp_73746f726167652e6173736f636961746976652e454447455f544147(), ["EMPTY_SEQUENCE"]: rp_73746f726167652e6173736f636961746976652e454d5054595f53455155454e4345(), ["BYTE_NODE_START"]: rp_73746f726167652e6173736f636961746976652e425954455f4e4f44455f5354415254(), ["SCHEMA_NODE_COUNT"]: rp_73746f726167652e6173736f636961746976652e534348454d415f4e4f44455f434f554e54(), ["SemanticLink"]: ml_make_SemanticLink_SemanticLink, ["split_repository_list"]: rp_73746f726167652e6173736f636961746976652e73706c69745f7265706f7369746f72795f6c697374 };
export const provenance = {"sourcePath":"src/storage/associative.rs","sourceSha256":"ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1","executable":14,"executableFunctions":1,"executableConstants":12,"executableTypes":1,"executableConstructors":1,"carried":48,"preserved":62,"runtimeParity":false};
