// Generated draft from src/upstream_guard.rs; sha256=ffeb0d85c4c499fd6083b04f4920e190eabb1b85d8d2a0ce3dfed66490f57349
// Carried constructs are data, never runtime parity evidence.
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
  return Object.freeze(["metadata.google.internal", "metadata", "instance-data"]);
}

export const translated = { ["ALLOW_PRIVATE_NETWORKS_ENV"]: rp_757073747265616d5f67756172642e414c4c4f575f505249564154455f4e4554574f524b535f454e56(), ["AddressClass"]: Object.freeze({ ["Loopback"]: ml_make_AddressClass_Loopback, ["Private"]: ml_make_AddressClass_Private, ["LinkLocal"]: ml_make_AddressClass_LinkLocal, ["NonUnicast"]: ml_make_AddressClass_NonUnicast }), ["NetworkPolicy"]: ml_make_NetworkPolicy_NetworkPolicy, ["METADATA_NAMES"]: rp_757073747265616d5f67756172642e4d455441444154415f4e414d4553() };
export const provenance = {"sourcePath":"src/upstream_guard.rs","sourceSha256":"ffeb0d85c4c499fd6083b04f4920e190eabb1b85d8d2a0ce3dfed66490f57349","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":5,"carried":18,"preserved":23,"runtimeParity":false};
