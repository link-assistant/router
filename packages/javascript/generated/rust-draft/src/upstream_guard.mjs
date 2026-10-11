// Generated draft from src/upstream_guard.rs; sha256=ffeb0d85c4c499fd6083b04f4920e190eabb1b85d8d2a0ce3dfed66490f57349
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0 = {"schemaVersion":1,"types":{"AddressClass":{"kind":"data","name":"AddressClass","ctors":[{"name":"Loopback","fields":[]},{"name":"Private","fields":[]},{"name":"LinkLocal","fields":[]},{"name":"NonUnicast","fields":[]}]}}};

const ml_host_value_refinements_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0 = new Map([]);

const ml_host_value_schema_f967bd38baf7842c37cf83fb6cf5840ea1f88e5cfd1990ed493ef64d92eb5bdc = {"schemaVersion":1,"types":{"NetworkPolicy":{"kind":"data","name":"NetworkPolicy","ctors":[{"name":"NetworkPolicy","fields":[{"name":"loopback","type":{"kind":"bool"}},{"name":"private","type":{"kind":"bool"}},{"name":"link_local","type":{"kind":"bool"}},{"name":"all","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_f967bd38baf7842c37cf83fb6cf5840ea1f88e5cfd1990ed493ef64d92eb5bdc = new Map([]);

function rp_757073747265616d5f67756172642e414c4c4f575f505249564154455f4e4554574f524b535f454e56() {
  return "UPSTREAM_ALLOW_PRIVATE_NETWORKS";
}

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

function ml_make_NetworkPolicy_NetworkPolicy(loopback, private_, link_local, all) {
  if (!(typeof loopback === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof private_ === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof link_local === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof all === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "NetworkPolicy", ["loopback"]: loopback, ["private"]: private_, ["link_local"]: link_local, ["all"]: all });
}

function rp_757073747265616d5f67756172642e4d455441444154415f4e414d4553() {
  return Object.freeze(Object.freeze(["metadata.google.internal", "metadata", "instance-data"]));
}

function ml_make_BlockedAddress_BlockedAddress(host, class_) {
  if (!(typeof host === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(host))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(class_, {"kind":"data","name":"AddressClass"}, ml_host_value_schema_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0, { refinements: ml_host_value_refinements_24ccf94982069cef471a5b34c27c955a31d027b7dc76ab79a11bfe79e6bdeed0 });
  return Object.freeze({ $: "BlockedAddress", ["host"]: host, ["class"]: class_ });
}

function ml_make_GuardedResolver_GuardedResolver(policy) {
  ml_validate_rust_value(policy, {"kind":"data","name":"NetworkPolicy"}, ml_host_value_schema_f967bd38baf7842c37cf83fb6cf5840ea1f88e5cfd1990ed493ef64d92eb5bdc, { refinements: ml_host_value_refinements_f967bd38baf7842c37cf83fb6cf5840ea1f88e5cfd1990ed493ef64d92eb5bdc });
  return Object.freeze({ $: "GuardedResolver", ["policy"]: policy });
}

export const translated = { ["ALLOW_PRIVATE_NETWORKS_ENV"]: rp_757073747265616d5f67756172642e414c4c4f575f505249564154455f4e4554574f524b535f454e56(), ["AddressClass"]: Object.freeze({ ["Loopback"]: ml_make_AddressClass_Loopback, ["Private"]: ml_make_AddressClass_Private, ["LinkLocal"]: ml_make_AddressClass_LinkLocal, ["NonUnicast"]: ml_make_AddressClass_NonUnicast }), ["NetworkPolicy"]: ml_make_NetworkPolicy_NetworkPolicy, ["METADATA_NAMES"]: rp_757073747265616d5f67756172642e4d455441444154415f4e414d4553(), ["BlockedAddress"]: ml_make_BlockedAddress_BlockedAddress, ["GuardedResolver"]: ml_make_GuardedResolver_GuardedResolver };
export const provenance = {"sourcePath":"src/upstream_guard.rs","sourceSha256":"ffeb0d85c4c499fd6083b04f4920e190eabb1b85d8d2a0ce3dfed66490f57349","executable":6,"executableFunctions":0,"executableConstants":2,"executableTypes":4,"executableConstructors":7,"carried":16,"preserved":23,"runtimeParity":false};
