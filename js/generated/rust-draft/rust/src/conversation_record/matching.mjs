// Generated draft from rust/src/conversation_record/matching.rs; sha256=ce9163edd43ff666df44967da8af252583ae0105c2b5b78c00e8754ab8af46bd
// Carried constructs are data, never runtime parity evidence.
import { borrowedStringSliceContains as ml_slice_str_contains, assertBorrowedStringSlice as ml_assert_str_slice } from "../../../runtime/slice-membership-runtime.mjs";

function rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e49474e4f5245445f48454144455253() {
  return Object.freeze(Object.freeze(["authorization", "content-length", "host", "proxy-authorization", "user-agent", "x-api-key", "x-request-id", "date", "cookie"]));
}

function rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e434f4d50415245445f4649454c4453() {
  return Object.freeze(Object.freeze(["method", "uri"]));
}

function rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e6865616465725f69735f636f6d7061726564(name) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  return !ml_slice_str_contains(rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e49474e4f5245445f48454144455253(), (name).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)), null);
}

function rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e52454e44455245445f4c494d4954() {
  return 120n;
}

export const translated = { ["IGNORED_HEADERS"]: rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e49474e4f5245445f48454144455253(), ["COMPARED_FIELDS"]: rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e434f4d50415245445f4649454c4453(), ["header_is_compared"]: rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e6865616465725f69735f636f6d7061726564, ["RENDERED_LIMIT"]: rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e52454e44455245445f4c494d4954() };
export const provenance = {"sourcePath":"rust/src/conversation_record/matching.rs","sourceSha256":"ce9163edd43ff666df44967da8af252583ae0105c2b5b78c00e8754ab8af46bd","executable":4,"executableFunctions":1,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":10,"runtimeParity":false};
