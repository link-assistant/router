// Generated draft from scripts/check-docker-platforms.rs; sha256=092d9626b067f1f3ccf51b524e1fdd0a12930428ef1340c9a801e19425439e4c
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function REQUIRED_PLATFORMS() {
  return ml_copy_fixed_array(["linux/amd64", "linux/arm64"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":2}});
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

function ATTESTATION_PLATFORM() {
  return "unknown/unknown";
}

export const translated = { ["REQUIRED_PLATFORMS"]: REQUIRED_PLATFORMS(), ["ATTESTATION_PLATFORM"]: ATTESTATION_PLATFORM() };
export const provenance = {"sourcePath":"scripts/check-docker-platforms.rs","sourceSha256":"092d9626b067f1f3ccf51b524e1fdd0a12930428ef1340c9a801e19425439e4c","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":11,"runtimeParity":false};
