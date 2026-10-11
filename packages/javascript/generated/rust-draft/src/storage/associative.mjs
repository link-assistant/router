// Generated draft from src/storage/associative.rs; sha256=ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1
// Carried constructs are data, never runtime parity evidence.
function TYPE() {
  return "Type";
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
};

const serde_json = {
  error: {

  },
};

function TOKEN_RECORD() {
  return "TokenRecord";
}

function SUBTYPE() {
  return "SubType";
}

function VALUE() {
  return "Value";
}

function STORAGE_FORMAT() {
  return "StorageFormat";
}

function FORMAT_VERSION() {
  return "router-token-doublets-v1";
}

function RECORD_PREFIX() {
  return "Record/";
}

function STRING_TAG() {
  return 1n;
}

function EDGE_TAG() {
  return 2n;
}

function EMPTY_SEQUENCE() {
  return 3n;
}

function BYTE_NODE_START() {
  return 4n;
}

function SCHEMA_NODE_COUNT() {
  return 259n;
}

function ml_make_SemanticLink_SemanticLink(source, target) {
  if (!(typeof source === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(source))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof target === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(target))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "SemanticLink", ["source"]: source, ["target"]: target });
}

export const translated = { ["TYPE"]: TYPE(), ["TOKEN_RECORD"]: TOKEN_RECORD(), ["SUBTYPE"]: SUBTYPE(), ["VALUE"]: VALUE(), ["STORAGE_FORMAT"]: STORAGE_FORMAT(), ["FORMAT_VERSION"]: FORMAT_VERSION(), ["RECORD_PREFIX"]: RECORD_PREFIX(), ["STRING_TAG"]: STRING_TAG(), ["EDGE_TAG"]: EDGE_TAG(), ["EMPTY_SEQUENCE"]: EMPTY_SEQUENCE(), ["BYTE_NODE_START"]: BYTE_NODE_START(), ["SCHEMA_NODE_COUNT"]: SCHEMA_NODE_COUNT(), ["SemanticLink"]: ml_make_SemanticLink_SemanticLink };
export const provenance = {"sourcePath":"src/storage/associative.rs","sourceSha256":"ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1","executable":13,"executableFunctions":0,"executableConstants":12,"executableTypes":1,"executableConstructors":1,"carried":49,"preserved":62,"runtimeParity":false};
