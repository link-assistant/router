// Generated draft from rust/src/deploy/runtime.rs; sha256=f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f = {"schemaVersion":1,"types":{"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}},{"name":"field2","type":{"kind":"bool"}}]}]}}};

const ml_constructor_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 = {"schemaVersion":1,"types":{"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_f26c78c0e68948c202e846dabef00cedfa093cefb1a0118d1785f67e5c22c7d8 = {"schemaVersion":1,"types":{"RunSpec":{"kind":"data","name":"RunSpec","ctors":[{"name":"RunSpec","fields":[{"name":"name","type":{"kind":"string"}},{"name":"image","type":{"kind":"string"}},{"name":"port","type":{"kind":"fixed","bits":16,"signed":false}},{"name":"mounts","type":{"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d"}}},{"name":"env","type":{"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d"}}},{"name":"label","type":{"kind":"string"}}]}]},"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}},{"name":"field2","type":{"kind":"bool"}}]}]},"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}}]}]}}};

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f = {"schemaVersion":1,"types":{"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}},{"name":"field2","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f = new Map([]);

const ml_host_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 = {"schemaVersion":1,"types":{"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 = new Map([]);

import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../../../runtime/string-iterator-runtime.mjs";

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../../../runtime/csv-string-runtime.mjs";

function* ml_router_map(values, transform) { for (const value of values) yield transform(value); }

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_make_ContainerState_Absent() {
  return Object.freeze({ $: 'Absent' });
}

function ml_make_ContainerState_Running() {
  return Object.freeze({ $: 'Running' });
}

function ml_make_ContainerState_Stopped() {
  return Object.freeze({ $: 'Stopped' });
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

function ml_make_RunSpec_RunSpec(name, image, port, mounts, env_2, label) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof image === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(image))) throw new TypeError('argument outside supported Rust value domain');
  if (typeof port !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(port, 0n, 65535n, "u16 argument port out of range");
  if (!(typeof port === 'bigint' && port >= 0n && port <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(mounts, {"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d"}}, ml_constructor_value_schema_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f);
  ml_validate_rust_value(mounts, {"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d"}}, ml_host_value_schema_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f, { refinements: ml_host_value_refinements_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f });
  ml_assert_constructor_input(env_2, {"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d"}}, ml_constructor_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1);
  ml_validate_rust_value(env_2, {"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d"}}, ml_host_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1, { refinements: ml_host_value_refinements_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 });
  if (!(typeof label === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(label))) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "RunSpec", ["name"]: name, ["image"]: image, ["port"]: port, ["mounts"]: mounts, ["env"]: env_2, ["label"]: label }), {"kind":"data","name":"RunSpec"}, ml_constructor_value_schema_f26c78c0e68948c202e846dabef00cedfa093cefb1a0118d1785f67e5c22c7d8);
}

function ml_make_Docker_Docker() {
  return Object.freeze({ $: "Docker" });
}

function rp_6465706c6f792e72756e74696d652e636f6d70616374(text) {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  return ml_str_join(ml_router_collect(ml_str_split_whitespace(text)), " ");
}

function rp_6465706c6f792e72756e74696d652e70617273655f6e616d6573(rendered) {
  if (!(typeof rendered === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rendered))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_collect(ml_router_map(ml_router_filter(ml_router_map(ml_str_lines(rendered), (ml_standard_callback_37_0) => { return (ml_standard_callback_37_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, ''); }), (name) => { return !(name.length === 0); }), (ml_standard_callback_38_0) => { return ml_csv_allocate(ml_standard_callback_38_0); }));
}

function rp_6465706c6f792e72756e74696d652e69735f616273656e74(error) {
  if (!(typeof error === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(error))) throw new TypeError('argument outside supported Rust value domain');
  const lowered = (error).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  return (((() => {
    const ml_text_1 = lowered;
    const ml_text_2 = "no such object";
    return ml_text_1.includes(ml_text_2);
  })() || (() => {
    const ml_text_3 = lowered;
    const ml_text_4 = "no such container";
    return ml_text_3.includes(ml_text_4);
  })()) || (() => {
    const ml_text_5 = lowered;
    const ml_text_6 = "no such image";
    return ml_text_5.includes(ml_text_6);
  })());
}

export const translated = { ["ContainerState"]: Object.freeze({ ["Absent"]: ml_make_ContainerState_Absent, ["Running"]: ml_make_ContainerState_Running, ["Stopped"]: ml_make_ContainerState_Stopped }), ["RunSpec"]: ml_make_RunSpec_RunSpec, ["Docker"]: ml_make_Docker_Docker, ["compact"]: rp_6465706c6f792e72756e74696d652e636f6d70616374, ["parse_names"]: rp_6465706c6f792e72756e74696d652e70617273655f6e616d6573, ["is_absent"]: rp_6465706c6f792e72756e74696d652e69735f616273656e74 };
export const provenance = {"sourcePath":"rust/src/deploy/runtime.rs","sourceSha256":"f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04","executable":6,"executableFunctions":3,"executableConstants":0,"executableTypes":3,"executableConstructors":5,"carried":9,"preserved":16,"runtimeParity":false};
