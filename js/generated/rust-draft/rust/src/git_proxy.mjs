// Generated draft from rust/src/git_proxy.rs; sha256=2d3412072f49da668a08e2510cf8b6fd379098ccc92a2a8ce41c788e3f13dbc3
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view, assertImmutableIterator as ml_assert_immutable_iterator } from "../../runtime/iterator-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

function rp_6769745f70726f78792e5a45524f5f4f4944() {
  return "0000000000000000000000000000000000000000";
}

function ml_make_RefUpdate_RefUpdate(old, new_, name) {
  if (!(typeof old === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(old))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof new_ === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(new_))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "RefUpdate", ["old"]: old, ["new"]: new_, ["name"]: name });
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

function ml_make_RefRefusal_Delete(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Delete', field0: field0 });
}

function ml_make_RefRefusal_NonFastForward(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'NonFastForward', field0: field0 });
}

function ml_make_RefRefusal_Unverifiable(field0, field1) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof field1 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field1))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Unverifiable', field0: field0, field1: field1 });
}

function ml_make_AncestryQuery_AncestryQuery(name, old, new_) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof old === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(old))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof new_ === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(new_))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "AncestryQuery", ["name"]: name, ["old"]: old, ["new"]: new_ });
}

function ml_make_Ancestry_FastForward() {
  return Object.freeze({ $: 'FastForward' });
}

function ml_make_Ancestry_Diverged() {
  return Object.freeze({ $: 'Diverged' });
}

function ml_make_Ancestry_Unknown() {
  return Object.freeze({ $: 'Unknown' });
}

function rp_6769745f70726f78792e616e6365737472795f66726f6d5f636f6d70617265(payload) {
  ml_pattern_immutable_view(payload);
  ml_validate_rust_value(payload, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_s4 = (() => {
    const ml_match_subject11 = ml_host_option_bind(ml_host_serde_json_value_get_string(payload, "status"), (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_9_0); }, "and_then");
    ml_pattern_immutable(ml_match_subject11);
    return ml_match_subject11;
  })();
  switch (ml_s4.$) {
    case "None": {
      return Object.freeze({ $: 'Unknown' });
    }
    case "Some": {
      const ml_f5 = ml_s4.field0;
      if ((ml_f5 === "ahead")) {
        return Object.freeze({ $: 'FastForward' });
      } else {
        if ((ml_f5 === "identical")) {
          return Object.freeze({ $: 'FastForward' });
        } else {
          if ((ml_f5 === "behind")) {
            return Object.freeze({ $: 'Diverged' });
          } else {
            if ((ml_f5 === "diverged")) {
              return Object.freeze({ $: 'Diverged' });
            } else {
              return Object.freeze({ $: 'Unknown' });
            }
          }
        }
      }
    }
    default: {
      return ml_router_unexpected(ml_s4);
    }
  }
}

function rp_6769745f70726f78792e73636f70655f61646d697473(allowed_repositories, repository) {
  if (!ml_router_array(allowed_repositories, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof repository === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(repository))) throw new TypeError('argument outside supported Rust value domain');
  return ((allowed_repositories.length === 0) || ml_router_any(ml_router_iter(allowed_repositories, false), (allowed) => { return ((allowed).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)) === (repository).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))); }));
}

function rp_6769745f70726f78792e63616e6f6e6963616c5f6769745f70617468(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_body_3 = (() => {
      const ml_text_1 = path;
      const ml_text_2 = "/api/services/github";
      return (ml_text_1.startsWith(ml_text_2)?Object.freeze({ $: 'Some', field0: ml_text_1.slice(ml_text_2.length) }):Object.freeze({ $: 'None' }));
    })();
    const ml_standard_body_4 = path;
    switch (ml_standard_body_3.$) {
      case "None": {
        return ml_standard_body_4;
      }
      case "Some": {
        const x = ml_standard_body_3.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_3);
      }
    }
  })();
}

export const translated = { ["ZERO_OID"]: rp_6769745f70726f78792e5a45524f5f4f4944(), ["RefUpdate"]: ml_make_RefUpdate_RefUpdate, ["RefRefusal"]: Object.freeze({ ["Delete"]: ml_make_RefRefusal_Delete, ["NonFastForward"]: ml_make_RefRefusal_NonFastForward, ["Unverifiable"]: ml_make_RefRefusal_Unverifiable }), ["AncestryQuery"]: ml_make_AncestryQuery_AncestryQuery, ["Ancestry"]: Object.freeze({ ["FastForward"]: ml_make_Ancestry_FastForward, ["Diverged"]: ml_make_Ancestry_Diverged, ["Unknown"]: ml_make_Ancestry_Unknown }), ["ancestry_from_compare"]: rp_6769745f70726f78792e616e6365737472795f66726f6d5f636f6d70617265, ["scope_admits"]: rp_6769745f70726f78792e73636f70655f61646d697473, ["canonical_git_path"]: rp_6769745f70726f78792e63616e6f6e6963616c5f6769745f70617468 };
export const provenance = {"sourcePath":"rust/src/git_proxy.rs","sourceSha256":"2d3412072f49da668a08e2510cf8b6fd379098ccc92a2a8ce41c788e3f13dbc3","executable":8,"executableFunctions":3,"executableConstants":1,"executableTypes":4,"executableConstructors":8,"carried":21,"preserved":30,"runtimeParity":false};
