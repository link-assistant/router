// Generated draft from rust/tests/common/tiers.rs; sha256=a1e4fd96b9a310cfceb2e1e54b3ff880ca8fbaa8fdc0f27317392445f614f3b7
// Carried constructs are data, never runtime parity evidence.
function ml_make_Tier_Unit() {
  return Object.freeze({ $: 'Unit' });
}

function ml_make_Tier_Integration() {
  return Object.freeze({ $: 'Integration' });
}

function ml_make_Tier_RealClientOffline() {
  return Object.freeze({ $: 'RealClientOffline' });
}

function ml_make_Tier_LiveCredentialed() {
  return Object.freeze({ $: 'LiveCredentialed' });
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

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

export const translated = { ["Tier"]: Object.freeze({ ["Unit"]: ml_make_Tier_Unit, ["Integration"]: ml_make_Tier_Integration, ["RealClientOffline"]: ml_make_Tier_RealClientOffline, ["LiveCredentialed"]: ml_make_Tier_LiveCredentialed }) };
export const provenance = {"sourcePath":"rust/tests/common/tiers.rs","sourceSha256":"a1e4fd96b9a310cfceb2e1e54b3ff880ca8fbaa8fdc0f27317392445f614f3b7","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":4,"carried":11,"preserved":13,"runtimeParity":false};
