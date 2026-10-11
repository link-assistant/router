// Generated draft from src/upstream_guard.rs; sha256=ffeb0d85c4c499fd6083b04f4920e190eabb1b85d8d2a0ce3dfed66490f57349
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0 = {"schemaVersion":1,"types":{"AddressClass":{"kind":"data","name":"AddressClass","ctors":[{"name":"Loopback","fields":[]},{"name":"Private","fields":[]},{"name":"LinkLocal","fields":[]},{"name":"NonUnicast","fields":[]}]}}};

const ml_host_value_refinements_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0 = new Map([]);

function ALLOW_PRIVATE_NETWORKS_ENV() {
  return "UPSTREAM_ALLOW_PRIVATE_NETWORKS";
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

function ml_make_AddressClass_Loopback() {
  return Object.freeze({ $: 'Loopback' });
}

function ml_make_AddressClass_Private() {
  return Object.freeze({ $: 'Private' });
}

function ml_make_AddressClass_LinkLocal() {
  return Object.freeze({ $: 'LinkLocal' });
}

function ml_make_AddressClass_NonUnicast() {
  return Object.freeze({ $: 'NonUnicast' });
}

function METADATA_NAMES() {
  return Object.freeze(["metadata.google.internal", "metadata", "instance-data"]);
}

function ml_make_BlockedAddress_BlockedAddress(host, class_) {
  if (!(typeof host === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(host))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(class_, {"kind":"data","name":"AddressClass"}, ml_host_value_schema_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0, { refinements: ml_host_value_refinements_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0 });
  return Object.freeze({ $: "BlockedAddress", ["host"]: host, ["class"]: class_ });
}

export const translated = { ["ALLOW_PRIVATE_NETWORKS_ENV"]: ALLOW_PRIVATE_NETWORKS_ENV(), ["AddressClass"]: Object.freeze({ ["Loopback"]: ml_make_AddressClass_Loopback, ["Private"]: ml_make_AddressClass_Private, ["LinkLocal"]: ml_make_AddressClass_LinkLocal, ["NonUnicast"]: ml_make_AddressClass_NonUnicast }), ["METADATA_NAMES"]: METADATA_NAMES(), ["BlockedAddress"]: ml_make_BlockedAddress_BlockedAddress };
export const provenance = {"sourcePath":"src/upstream_guard.rs","sourceSha256":"ffeb0d85c4c499fd6083b04f4920e190eabb1b85d8d2a0ce3dfed66490f57349","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":5,"carried":18,"preserved":23,"runtimeParity":false};
