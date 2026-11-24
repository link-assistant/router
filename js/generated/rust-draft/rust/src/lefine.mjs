// Generated draft from rust/src/lefine.rs; sha256=585ff6270beaaf1829a5e3ec0df2378fe2eb595b4056f3bb86378e274204acad
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_29686d8bc98208563ba836c695871ae590fff53311ee928bf210afb2c9bec5d4 = {"schemaVersion":1,"types":{"CatalogFailureKind":{"kind":"data","name":"CatalogFailureKind","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unavailable","fields":[]}]}}};

const ml_constructor_value_schema_0aa93e5d633574f999fe947977ddf000065c7cc75b54ea51ce7f859e24b104a5 = {"schemaVersion":1,"types":{"CatalogFailure":{"kind":"data","name":"CatalogFailure","ctors":[{"name":"CatalogFailure","fields":[{"name":"kind","type":{"kind":"data","name":"CatalogFailureKind"}},{"name":"message","type":{"kind":"string"}}]}]},"CatalogFailureKind":{"kind":"data","name":"CatalogFailureKind","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unavailable","fields":[]}]}}};

const ml_host_value_schema_29686d8bc98208563ba836c695871ae590fff53311ee928bf210afb2c9bec5d4 = {"schemaVersion":1,"types":{"CatalogFailureKind":{"kind":"data","name":"CatalogFailureKind","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unavailable","fields":[]}]}}};

const ml_host_value_refinements_29686d8bc98208563ba836c695871ae590fff53311ee928bf210afb2c9bec5d4 = new Map([]);

const ml_constructor_value_schema_b1dcba45f86d22f78d36c4524144916181cc22ccbffdf6cbc00b60de8b22a990 = {"schemaVersion":1,"types":{"rp_6c6566696e652e436174616c6f674661696c757265":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c757265","ctors":[{"name":"CatalogFailure","fields":[{"name":"kind","type":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64"}},{"name":"message","type":{"kind":"string"}}]}]},"rp_6c6566696e652e436174616c6f674661696c7572654b696e64":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unavailable","fields":[]}]}}};

const ml_host_value_schema_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61 = {"schemaVersion":1,"types":{"rp_6c6566696e652e436174616c6f674661696c7572654b696e64":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unavailable","fields":[]}]}}};

const ml_host_value_refinements_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61 = new Map([]);

function rp_6c6566696e652e424153455f55524c() {
  return "https://lefine.pro/v1";
}

function rp_6c6566696e652e434f4d50415449424c455f434c49454e5453() {
  return ml_copy_fixed_array(["grok", "opencode", "qwen"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

function rp_6c6566696e652e4d41585f434154414c4f475f424f4459() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_CatalogFailureKind_CredentialRejected() {
  return Object.freeze({ $: 'CredentialRejected' });
}

function ml_make_CatalogFailureKind_RateLimited() {
  return Object.freeze({ $: 'RateLimited' });
}

function ml_make_CatalogFailureKind_Unavailable() {
  return Object.freeze({ $: 'Unavailable' });
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

function ml_make_CatalogFailure_CatalogFailure(kind, message) {
  ml_assert_constructor_input(kind, {"kind":"data","name":"CatalogFailureKind"}, ml_constructor_value_schema_29686d8bc98208563ba836c695871ae590fff53311ee928bf210afb2c9bec5d4);
  ml_validate_rust_value(kind, {"kind":"data","name":"CatalogFailureKind"}, ml_host_value_schema_29686d8bc98208563ba836c695871ae590fff53311ee928bf210afb2c9bec5d4, { refinements: ml_host_value_refinements_29686d8bc98208563ba836c695871ae590fff53311ee928bf210afb2c9bec5d4 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "CatalogFailure", ["kind"]: kind, ["message"]: message }), {"kind":"data","name":"CatalogFailure"}, ml_constructor_value_schema_0aa93e5d633574f999fe947977ddf000065c7cc75b54ea51ce7f859e24b104a5);
}

function rp_6c6566696e652e636174616c6f675f75726c(base_url) {
  if (!(typeof base_url === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(base_url))) throw new TypeError('argument outside supported Rust value domain');
  const base = ((text, pattern) => { const chars=Array.from(text); let start=0, end=chars.length; while(end>start&&pattern.includes(chars[end-1]))end--;return chars.slice(start,end).join(''); })(base_url, Object.freeze(["/"]));
  if ((() => {
    const ml_text_1 = base;
    const ml_text_2 = "/v1";
    return ml_text_1.endsWith(ml_text_2);
  })()) {
    return (() => {
    const ml_fmt_3 = base;
    return (ml_fmt_3 + "/models");
  })();
  } else {
    return (() => {
    const ml_fmt_4 = base;
    return (ml_fmt_4 + "/v1/models");
  })();
  }
}

function rp_6c6566696e652e756e617661696c61626c65(message) {
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return rp_6c6566696e652e6d6c5f696d706c5f3633373236313734363532653663363536363639366536353265343336313734363136633666363734363631363936633735373236355f366536353737(Object.freeze({ $: 'Unavailable' }), message);
}

function rp_6c6566696e652e6d6c5f696d706c5f3633373236313734363532653663363536363639366536353265343336313734363136633666363734363631363936633735373236355f366536353737(kind, message) {
  ml_validate_rust_value(kind, {"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64"}, ml_host_value_schema_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61, { refinements: ml_host_value_refinements_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = kind;
  const ml_record2 = message;
  return ml_snapshot_constructor_value(Object.freeze({ $: "CatalogFailure", ["kind"]: ml_record1, ["message"]: ml_record2 }), {"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c757265"}, ml_constructor_value_schema_b1dcba45f86d22f78d36c4524144916181cc22ccbffdf6cbc00b60de8b22a990);
}

export const translated = { ["BASE_URL"]: rp_6c6566696e652e424153455f55524c(), ["COMPATIBLE_CLIENTS"]: rp_6c6566696e652e434f4d50415449424c455f434c49454e5453(), ["MAX_CATALOG_BODY"]: rp_6c6566696e652e4d41585f434154414c4f475f424f4459(), ["CatalogFailureKind"]: Object.freeze({ ["CredentialRejected"]: ml_make_CatalogFailureKind_CredentialRejected, ["RateLimited"]: ml_make_CatalogFailureKind_RateLimited, ["Unavailable"]: ml_make_CatalogFailureKind_Unavailable }), ["CatalogFailure"]: ml_make_CatalogFailure_CatalogFailure, ["catalog_url"]: rp_6c6566696e652e636174616c6f675f75726c, ["unavailable"]: rp_6c6566696e652e756e617661696c61626c65 };
export const provenance = {"sourcePath":"rust/src/lefine.rs","sourceSha256":"585ff6270beaaf1829a5e3ec0df2378fe2eb595b4056f3bb86378e274204acad","executable":7,"executableFunctions":2,"executableConstants":3,"executableTypes":2,"executableConstructors":4,"carried":10,"preserved":18,"runtimeParity":false};
