// Generated draft from tests/network_security_audit_test.rs; sha256=1635e839cf1612c7659d584a854c34aa0b12ecec354e9ad745cf88b4ec7ada25
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_d0bd7d8ee0527eb5027517ded2e2af480a430907180aebfad49fc7e12fb01eab = {"schemaVersion":1,"types":{"FeatureSwitches":{"kind":"data","name":"FeatureSwitches","ctors":[{"name":"FeatureSwitches","fields":[{"name":"mpp","type":{"kind":"bool"}},{"name":"github","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_d0bd7d8ee0527eb5027517ded2e2af480a430907180aebfad49fc7e12fb01eab = new Map([]);

const ml_host_value_schema_9968eab1fc282360af5ea34de83014037e65c8b494560cf5335a4800d4ad6c5d = {"schemaVersion":1,"types":{"ApiSwitches":{"kind":"data","name":"ApiSwitches","ctors":[{"name":"ApiSwitches","fields":[{"name":"openai","type":{"kind":"bool"}},{"name":"anthropic","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_9968eab1fc282360af5ea34de83014037e65c8b494560cf5335a4800d4ad6c5d = new Map([]);

function ml_make_SurfaceSwitches_SurfaceSwitches(disable_metrics, features, apis) {
  if (!(typeof disable_metrics === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(features, {"kind":"data","name":"FeatureSwitches"}, ml_host_value_schema_d0bd7d8ee0527eb5027517ded2e2af480a430907180aebfad49fc7e12fb01eab, { refinements: ml_host_value_refinements_d0bd7d8ee0527eb5027517ded2e2af480a430907180aebfad49fc7e12fb01eab });
  ml_validate_rust_value(apis, {"kind":"data","name":"ApiSwitches"}, ml_host_value_schema_9968eab1fc282360af5ea34de83014037e65c8b494560cf5335a4800d4ad6c5d, { refinements: ml_host_value_refinements_9968eab1fc282360af5ea34de83014037e65c8b494560cf5335a4800d4ad6c5d });
  return Object.freeze({ $: "SurfaceSwitches", ["disable_metrics"]: disable_metrics, ["features"]: features, ["apis"]: apis });
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

function ml_make_FeatureSwitches_FeatureSwitches(mpp, github) {
  if (!(typeof mpp === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof github === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "FeatureSwitches", ["mpp"]: mpp, ["github"]: github });
}

function ml_make_ApiSwitches_ApiSwitches(openai, anthropic) {
  if (!(typeof openai === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof anthropic === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ApiSwitches", ["openai"]: openai, ["anthropic"]: anthropic });
}

export const translated = { ["SurfaceSwitches"]: ml_make_SurfaceSwitches_SurfaceSwitches, ["FeatureSwitches"]: ml_make_FeatureSwitches_FeatureSwitches, ["ApiSwitches"]: ml_make_ApiSwitches_ApiSwitches };
export const provenance = {"sourcePath":"tests/network_security_audit_test.rs","sourceSha256":"1635e839cf1612c7659d584a854c34aa0b12ecec354e9ad745cf88b4ec7ada25","executable":3,"executableFunctions":0,"executableConstants":0,"executableTypes":3,"executableConstructors":3,"carried":32,"preserved":36,"runtimeParity":false};
