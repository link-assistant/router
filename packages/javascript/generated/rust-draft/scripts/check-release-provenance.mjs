// Generated draft from scripts/check-release-provenance.rs; sha256=590207c19dcd8516fa344b855459aa4250a34e7d314015908d7e383bfee9d2ba
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

function REVISION_LABEL() {
  return "org.opencontainers.image.revision";
}

function VERSION_LABEL() {
  return "org.opencontainers.image.version";
}

export const translated = { ["REQUIRED_PLATFORMS"]: REQUIRED_PLATFORMS(), ["REVISION_LABEL"]: REVISION_LABEL(), ["VERSION_LABEL"]: VERSION_LABEL() };
export const provenance = {"sourcePath":"scripts/check-release-provenance.rs","sourceSha256":"590207c19dcd8516fa344b855459aa4250a34e7d314015908d7e383bfee9d2ba","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":24,"preserved":27,"runtimeParity":false};
