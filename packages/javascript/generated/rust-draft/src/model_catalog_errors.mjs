// Generated draft from src/model_catalog_errors.rs; sha256=286e433858cb1f3b4308c7b395a82ab05e4053f2699cea03c4e089f936fd469f
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function PERMISSION_ERROR_CODES() {
  return ml_copy_fixed_array(["oauth_not_allowed_for_organization"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":1}});
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

export const translated = { ["PERMISSION_ERROR_CODES"]: PERMISSION_ERROR_CODES() };
export const provenance = {"sourcePath":"src/model_catalog_errors.rs","sourceSha256":"286e433858cb1f3b4308c7b395a82ab05e4053f2699cea03c4e089f936fd469f","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":4,"preserved":5,"runtimeParity":false};
