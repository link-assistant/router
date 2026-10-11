// Generated draft from src/storage/associative.rs; sha256=ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1
// Carried constructs are data, never runtime parity evidence.
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

export const translated = { ["TYPE"]: rp_73746f726167652e6173736f636961746976652e54595045(), ["TOKEN_RECORD"]: rp_73746f726167652e6173736f636961746976652e544f4b454e5f5245434f5244(), ["SUBTYPE"]: rp_73746f726167652e6173736f636961746976652e53554254595045(), ["VALUE"]: rp_73746f726167652e6173736f636961746976652e56414c5545(), ["STORAGE_FORMAT"]: rp_73746f726167652e6173736f636961746976652e53544f524147455f464f524d4154(), ["FORMAT_VERSION"]: rp_73746f726167652e6173736f636961746976652e464f524d41545f56455253494f4e(), ["RECORD_PREFIX"]: rp_73746f726167652e6173736f636961746976652e5245434f52445f505245464958(), ["STRING_TAG"]: rp_73746f726167652e6173736f636961746976652e535452494e475f544147(), ["EDGE_TAG"]: rp_73746f726167652e6173736f636961746976652e454447455f544147(), ["EMPTY_SEQUENCE"]: rp_73746f726167652e6173736f636961746976652e454d5054595f53455155454e4345(), ["BYTE_NODE_START"]: rp_73746f726167652e6173736f636961746976652e425954455f4e4f44455f5354415254(), ["SCHEMA_NODE_COUNT"]: rp_73746f726167652e6173736f636961746976652e534348454d415f4e4f44455f434f554e54(), ["SemanticLink"]: ml_make_SemanticLink_SemanticLink };
export const provenance = {"sourcePath":"src/storage/associative.rs","sourceSha256":"ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1","executable":13,"executableFunctions":0,"executableConstants":12,"executableTypes":1,"executableConstructors":1,"carried":49,"preserved":62,"runtimeParity":false};
