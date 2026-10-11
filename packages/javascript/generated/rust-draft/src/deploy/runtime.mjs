// Generated draft from src/deploy/runtime.rs; sha256=f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f = {"schemaVersion":1,"types":{"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}},{"name":"field2","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f = new Map([]);

const ml_host_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 = {"schemaVersion":1,"types":{"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 = new Map([]);

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
  ml_validate_rust_value(mounts, {"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_4_bool_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b7d5d"}}, ml_host_value_schema_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f, { refinements: ml_host_value_refinements_482b1e3de0c79a6191b07fddd1ced39034c7d6bbab7634430299358b35c6839f });
  ml_validate_rust_value(env_2, {"kind":"array","element":{"kind":"data","name":"RouterTuple_17_rust_owned_string_17_rust_owned_string_rust_5b7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d"}}, ml_host_value_schema_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1, { refinements: ml_host_value_refinements_6cda2b703e08fb8b8766349c5c03f01c1448dddb9ec13fa2813520f59b8614b1 });
  if (!(typeof label === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(label))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "RunSpec", ["name"]: name, ["image"]: image, ["port"]: port, ["mounts"]: mounts, ["env"]: env_2, ["label"]: label });
}

function ml_make_Docker_Docker() {
  return Object.freeze({ $: "Docker" });
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

export const translated = { ["ContainerState"]: Object.freeze({ ["Absent"]: ml_make_ContainerState_Absent, ["Running"]: ml_make_ContainerState_Running, ["Stopped"]: ml_make_ContainerState_Stopped }), ["RunSpec"]: ml_make_RunSpec_RunSpec, ["Docker"]: ml_make_Docker_Docker, ["is_absent"]: rp_6465706c6f792e72756e74696d652e69735f616273656e74 };
export const provenance = {"sourcePath":"src/deploy/runtime.rs","sourceSha256":"f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04","executable":4,"executableFunctions":1,"executableConstants":0,"executableTypes":3,"executableConstructors":5,"carried":11,"preserved":16,"runtimeParity":false};
